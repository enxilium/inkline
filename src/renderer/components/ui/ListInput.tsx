import * as React from "react";
import classNames from "clsx";
import { CloseIcon, PlusIcon } from "./Icons";
import type { Instance as TippyInstance } from "tippy.js";
import {
    RichTextAreaInput,
    type RichTextAreaInputRef,
} from "./RichTextAreaInput";
import {
    createReferenceLookup,
    createReferencePreviewPopup,
    getReferenceKey,
    isElementPartOfLanguageToolProblem,
} from "./documentReferencePreview";

// ─────────────────────────────────────────────────────────────────────────────
// Types for document references
// ─────────────────────────────────────────────────────────────────────────────

export type DocumentRefKind =
    | "chapter"
    | "scrapNote"
    | "character"
    | "location"
    | "organization";

export interface DocumentRef {
    kind: DocumentRefKind;
    id: string;
    name: string;
    previewTitle?: string;
    previewContent?: string;
    previewContentType?: "tiptap-json" | "html" | "text";
}

export interface ListItem {
    text: string;
    references?: DocumentRef[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ListInput Component
// ─────────────────────────────────────────────────────────────────────────────

export interface ListInputProps {
    value: string[];
    onChange: (items: string[]) => void;
    onBlur?: () => void;
    placeholder?: string;
    addButtonLabel?: string;
    emptyMessage?: string;
    className?: string;
    /** Available documents for slash-command references */
    availableDocuments?: DocumentRef[];
    /** Callback when a reference is clicked */
    onReferenceClick?: (ref: DocumentRef) => void;
}

export const ListInput: React.FC<ListInputProps> = ({
    value,
    onChange,
    onBlur,
    placeholder = "Add an item...",
    addButtonLabel = "Add",
    className,
    availableDocuments = [],
    onReferenceClick,
}) => {
    const [inputValue, setInputValue] = React.useState("");
    const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
    const [editValue, setEditValue] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<RichTextAreaInputRef>(null);
    const editInputRef = React.useRef<RichTextAreaInputRef>(null);
    const activePreviewRef = React.useRef<{
        key: string;
        popup: TippyInstance;
        anchor: HTMLElement;
    } | null>(null);

    const referenceLookup = React.useMemo(
        () => createReferenceLookup(availableDocuments),
        [availableDocuments],
    );

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addItem();
        }
    };

    const addItem = () => {
        // Strip HTML tags to check if empty, but keep HTML for storage
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = inputValue;
        const textContent = tempDiv.textContent || tempDiv.innerText || "";

        if (textContent.trim()) {
            onChange([...value, inputValue]);
            setInputValue("");
            // Focus back on input? It should stay focused.
        }
    };

    const removeItem = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditValue(value[index]);
        // Focus is handled by autoFocus on the new input
    };

    const saveEdit = () => {
        if (editingIndex !== null) {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = editValue;
            const textContent = tempDiv.textContent || tempDiv.innerText || "";

            if (textContent.trim()) {
                const newValue = [...value];
                newValue[editingIndex] = editValue;
                onChange(newValue);
            }
            setEditingIndex(null);
            setEditValue("");
        }
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditValue("");
    };

    const handleEditKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            saveEdit();
        } else if (e.key === "Escape") {
            cancelEdit();
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            if (editingIndex !== null) {
                saveEdit();
            }
            onBlur?.();
        }
    };

    React.useEffect(() => {
        return () => {
            if (activePreviewRef.current) {
                activePreviewRef.current.popup.destroy();
                activePreviewRef.current = null;
            }
        };
    }, []);

    const hideReferencePreview = React.useCallback(() => {
        if (!activePreviewRef.current) {
            return;
        }

        activePreviewRef.current.popup.destroy();
        activePreviewRef.current = null;
    }, []);

    const showReferencePreview = React.useCallback(
        (anchor: HTMLElement) => {
            if (isElementPartOfLanguageToolProblem(anchor)) {
                return;
            }

            const id = anchor.getAttribute("data-id");
            const kind = anchor.getAttribute(
                "data-kind",
            ) as DocumentRefKind | null;
            const name =
                anchor.getAttribute("data-label") || anchor.textContent || "";

            if (!id || !kind) {
                hideReferencePreview();
                return;
            }

            const key = getReferenceKey(kind, id);
            if (activePreviewRef.current?.key === key) {
                return;
            }

            hideReferencePreview();

            const previewRef = referenceLookup.get(key) ?? {
                id,
                kind,
                name,
                previewTitle: name,
                previewContent: "",
                previewContentType: "text" as const,
            };

            const popup = createReferencePreviewPopup(anchor, previewRef);
            popup.show();
            activePreviewRef.current = { key, popup, anchor };
        },
        [hideReferencePreview, referenceLookup],
    );

    const handleItemMouseOver = React.useCallback(
        (e: React.MouseEvent) => {
            const target = e.target as HTMLElement;
            const refNode = target.closest(
                '[data-type="documentReference"]',
            ) as HTMLElement | null;

            if (!refNode) {
                return;
            }

            showReferencePreview(refNode);
        },
        [showReferencePreview],
    );

    const handleItemMouseOut = React.useCallback(
        (e: React.MouseEvent) => {
            const related = e.relatedTarget as Node | null;
            if (!activePreviewRef.current) {
                return;
            }

            if (related && activePreviewRef.current.anchor.contains(related)) {
                return;
            }

            hideReferencePreview();
        },
        [hideReferencePreview],
    );

    // Handle clicks on document references in the rendered list
    const handleItemClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        // Check if clicked element is a document reference
        // The structure is <span data-type="documentReference" ...>
        const refNode = target.closest('[data-type="documentReference"]');
        if (refNode) {
            e.preventDefault();
            e.stopPropagation();
            const id = refNode.getAttribute("data-id");
            const kind = refNode.getAttribute("data-kind") as DocumentRefKind;
            const name =
                refNode.getAttribute("data-label") || refNode.textContent || "";

            if (id && onReferenceClick) {
                onReferenceClick({ id, kind, name });
            }
        } else if (editingIndex === null) {
            // If not clicking a reference, and not editing, maybe start editing?
            // But we have a specific click handler for text.
        }
    };

    return (
        <div
            ref={containerRef}
            className={classNames("list-input-container", className)}
            onBlur={handleBlur}
        >
            {/* Add new item input */}
            <div className="list-input-add-wrapper">
                <div className="list-input-add-row">
                    <RichTextAreaInput
                        ref={inputRef}
                        value={inputValue}
                        onChange={setInputValue}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        availableDocuments={availableDocuments}
                        onReferenceClick={onReferenceClick}
                        singleLine
                        rows={1}
                        className="list-input-field-rich"
                    />
                    <button
                        type="button"
                        className="list-input-add-btn"
                        onClick={addItem}
                        disabled={
                            !inputValue.trim() || inputValue === "<p></p>"
                        }
                    >
                        <PlusIcon size={14} />
                        {addButtonLabel && <span>{addButtonLabel}</span>}
                    </button>
                </div>
            </div>

            {/* Items list */}
            {value.length > 0 && (
                <div className="list-input-items">
                    {value.map((item, index) => (
                        <div
                            key={index}
                            className="list-input-item"
                            onClick={handleItemClick}
                            onMouseOver={handleItemMouseOver}
                            onMouseOut={handleItemMouseOut}
                        >
                            {editingIndex === index ? (
                                <div className="list-input-edit-wrapper">
                                    <RichTextAreaInput
                                        ref={editInputRef}
                                        value={editValue}
                                        onChange={setEditValue}
                                        onKeyDown={handleEditKeyDown}
                                        availableDocuments={availableDocuments}
                                        onReferenceClick={onReferenceClick}
                                        autoFocus
                                        singleLine
                                        rows={1}
                                        className="list-input-edit-field-rich"
                                    />
                                    <div className="list-input-edit-actions">
                                        <button
                                            type="button"
                                            onClick={saveEdit}
                                            className="list-input-action-btn confirm"
                                        >
                                            <PlusIcon size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="list-input-action-btn cancel"
                                        >
                                            <CloseIcon size={14} />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="list-input-item-text rich-text-content"
                                        onClick={() => startEditing(index)}
                                        dangerouslySetInnerHTML={{
                                            __html: item,
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="list-input-item-remove"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeItem(index);
                                        }}
                                    >
                                        <CloseIcon size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
