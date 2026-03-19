import * as React from "react";
import classNames from "clsx";
import { CloseIcon, PlusIcon } from "./Icons";
import type { Instance as TippyInstance } from "tippy.js";
import {
    RichTextAreaInput,
    type RichTextAreaInputRef,
} from "./RichTextAreaInput";
import { DocumentRef, DocumentRefKind } from "./ListInput";
import {
    createReferenceLookup,
    createReferencePreviewPopup,
    getReferenceKey,
    isElementPartOfLanguageToolProblem,
} from "./documentReferencePreview";

export interface RichListItem {
    title: string;
    description: string;
}

export interface RichListInputProps {
    value: RichListItem[];
    onChange: (items: RichListItem[]) => void;
    onBlur?: () => void;
    placeholderTitle?: string;
    placeholderDescription?: string;
    addButtonLabel?: string;
    className?: string;
    availableDocuments?: DocumentRef[];
    onReferenceClick?: (ref: DocumentRef) => void;
}

export const RichListInput: React.FC<RichListInputProps> = ({
    value,
    onChange,
    onBlur,
    placeholderTitle = "Title...",
    placeholderDescription = "Description...",
    addButtonLabel = "Add",
    className,
    availableDocuments = [],
    onReferenceClick,
}) => {
    const [inputTitle, setInputTitle] = React.useState("");
    const [inputDescription, setInputDescription] = React.useState("");

    const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
    const [editTitle, setEditTitle] = React.useState("");
    const [editDescription, setEditDescription] = React.useState("");

    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputDescriptionRef = React.useRef<RichTextAreaInputRef>(null);
    const editDescriptionRef = React.useRef<RichTextAreaInputRef>(null);
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
        if (e.key === "Enter" && e.ctrlKey) {
            e.preventDefault();
            addItem();
        }
    };

    const addItem = () => {
        if (inputTitle.trim() || inputDescription.trim()) {
            onChange([
                ...value,
                { title: inputTitle, description: inputDescription },
            ]);
            setInputTitle("");
            setInputDescription("");
        }
    };

    const removeItem = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const startEditing = (index: number) => {
        setEditingIndex(index);
        setEditTitle(value[index].title);
        setEditDescription(value[index].description);
    };

    const saveEdit = () => {
        if (editingIndex !== null) {
            const newValue = [...value];
            newValue[editingIndex] = {
                title: editTitle,
                description: editDescription,
            };
            onChange(newValue);
            setEditingIndex(null);
            setEditTitle("");
            setEditDescription("");
        }
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditTitle("");
        setEditDescription("");
    };

    const handleEditKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter" && e.ctrlKey) {
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

    const handleItemClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
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
        }
    };

    return (
        <div
            ref={containerRef}
            className={classNames(
                "list-input-container rich-list-input",
                className,
            )}
            onBlur={handleBlur}
        >
            {/* Add new item input */}
            <div className="list-input-add-wrapper rich-list-add-wrapper">
                <div className="rich-list-add-column">
                    <input
                        type="text"
                        className="rich-list-title-input"
                        value={inputTitle}
                        onChange={(e) => setInputTitle(e.target.value)}
                        placeholder={placeholderTitle}
                    />
                    <RichTextAreaInput
                        ref={inputDescriptionRef}
                        value={inputDescription}
                        onChange={setInputDescription}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholderDescription}
                        availableDocuments={availableDocuments}
                        onReferenceClick={onReferenceClick}
                        className="list-input-field-rich"
                    />
                </div>
                <button
                    type="button"
                    className="list-input-add-btn"
                    onClick={addItem}
                    disabled={
                        !inputTitle.trim() &&
                        (!inputDescription.trim() ||
                            inputDescription === "<p></p>")
                    }
                >
                    <PlusIcon size={14} />
                    {addButtonLabel && <span>{addButtonLabel}</span>}
                </button>
            </div>

            {/* Items list */}
            {value.length > 0 && (
                <div className="list-input-items">
                    {value.map((item, index) => (
                        <div
                            key={index}
                            className="list-input-item rich-list-item"
                            onClick={handleItemClick}
                            onMouseOver={handleItemMouseOver}
                            onMouseOut={handleItemMouseOut}
                        >
                            {editingIndex === index ? (
                                <div className="list-input-edit-wrapper rich-list-edit-wrapper">
                                    <div className="rich-list-edit-fields">
                                        <input
                                            type="text"
                                            className="rich-list-title-input"
                                            value={editTitle}
                                            onChange={(e) =>
                                                setEditTitle(e.target.value)
                                            }
                                            placeholder={placeholderTitle}
                                            autoFocus
                                        />
                                        <RichTextAreaInput
                                            ref={editDescriptionRef}
                                            value={editDescription}
                                            onChange={setEditDescription}
                                            onKeyDown={handleEditKeyDown}
                                            availableDocuments={
                                                availableDocuments
                                            }
                                            onReferenceClick={onReferenceClick}
                                            className="list-input-edit-field-rich"
                                        />
                                    </div>
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
                                        className="rich-list-item-content"
                                        onClick={() => startEditing(index)}
                                    >
                                        <div className="rich-list-item-title">
                                            {item.title}
                                        </div>
                                        <div
                                            className="rich-list-item-description rich-text-content"
                                            dangerouslySetInnerHTML={{
                                                __html: item.description,
                                            }}
                                        />
                                    </div>
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
