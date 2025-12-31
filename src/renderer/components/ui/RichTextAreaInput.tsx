import React, {
    useEffect,
    useRef,
    forwardRef,
    useImperativeHandle,
} from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
    DocumentReference,
    createDocumentReferenceSuggestion,
} from "../../tiptap/documentReference";
import type { DocumentRef } from "./ListInput";
import classNames from "clsx";

export interface RichTextAreaInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    id?: string;
    availableDocuments?: DocumentRef[];
    onReferenceClick?: (ref: DocumentRef) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    autoFocus?: boolean;
    singleLine?: boolean;
}

export interface RichTextAreaInputRef {
    focus: () => void;
    editor: Editor | null;
}

export const RichTextAreaInput = forwardRef<
    RichTextAreaInputRef,
    RichTextAreaInputProps
>(
    (
        {
            value,
            onChange,
            placeholder,
            rows = 4,
            className,
            id,
            availableDocuments = [],
            onReferenceClick,
            onKeyDown,
            autoFocus,
            singleLine,
        },
        ref
    ) => {
        // Keep a ref to availableDocuments so the extension can access the latest list
        const docsRef = useRef(availableDocuments);
        useEffect(() => {
            docsRef.current = availableDocuments;
        }, [availableDocuments]);

        const editor = useEditor({
            extensions: [
                StarterKit,
                DocumentReference.configure({
                    suggestion: createDocumentReferenceSuggestion({
                        availableDocuments: () => docsRef.current,
                        onReferenceClick,
                    }),
                }),
            ],
            content: value,
            autofocus: autoFocus,
            onUpdate: ({ editor }) => {
                onChange(editor.getHTML());
            },
            editorProps: {
                attributes: {
                    class: classNames("rich-textarea-input", className, {
                        "single-line": singleLine,
                    }),
                    style: singleLine
                        ? undefined
                        : `min-height: ${rows * 1.5}em;`,
                    id: id,
                },
                handleKeyDown: (view, event) => {
                    if (onKeyDown) {
                        onKeyDown(event as unknown as KeyboardEvent);
                    }
                    if (
                        singleLine &&
                        event.key === "Enter" &&
                        !event.shiftKey
                    ) {
                        return true; // Prevent default newline
                    }
                    return false;
                },
            },
        });

        useImperativeHandle(ref, () => ({
            focus: () => editor?.commands.focus(),
            editor: editor,
        }));

        // Sync value changes from parent
        useEffect(() => {
            if (editor && value !== editor.getHTML()) {
                if (editor.getHTML() !== value) {
                    editor.commands.setContent(value);
                }
            }
        }, [value, editor]);

        return (
            <div className="rich-textarea-wrapper">
                <EditorContent editor={editor} />
                {editor?.isEmpty && placeholder && (
                    <div className="rich-textarea-placeholder">
                        {placeholder}
                    </div>
                )}
            </div>
        );
    }
);

RichTextAreaInput.displayName = "RichTextAreaInput";
