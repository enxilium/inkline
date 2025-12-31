import * as React from "react";
import classNames from "clsx";
import { CloseIcon, PlusIcon } from "./Icons";
import {
    RichTextAreaInput,
    type RichTextAreaInputRef,
} from "./RichTextAreaInput";
import { DocumentRef, DocumentRefKind } from "./ListInput";

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
    emptyMessage?: string;
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
    emptyMessage = "No items yet",
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
                className
            )}
            onBlur={handleBlur}
        >
            {/* Items list */}
            <div className="list-input-items">
                {value.length === 0 ? (
                    <div className="list-input-empty">{emptyMessage}</div>
                ) : (
                    value.map((item, index) => (
                        <div
                            key={index}
                            className="list-input-item rich-list-item"
                            onClick={handleItemClick}
                        >
                            {editingIndex === index ? (
                                <div className="list-input-edit-wrapper rich-edit-wrapper">
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
                                        availableDocuments={availableDocuments}
                                        onReferenceClick={onReferenceClick}
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
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Add new item input */}
            <div className="list-input-add-wrapper rich-add-wrapper">
                <div className="list-input-add-column">
                    <input
                        type="text"
                        className="rich-list-title-input"
                        value={inputTitle}
                        onChange={(e) => setInputTitle(e.target.value)}
                        placeholder={placeholderTitle}
                    />
                    <div className="rich-list-description-row">
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
                </div>
            </div>
        </div>
    );
};
