import React, {
    useEffect,
    useRef,
    useMemo,
    forwardRef,
    useImperativeHandle,
} from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
    DocumentReference,
    createDocumentReferenceSuggestion,
} from "../../tiptap/documentReference";
import { LanguageTool } from "../../tiptap/languageTool";
import { LanguageToolPopup } from "../workspace/LanguageToolPopup";
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
    enableGrammarCheck?: boolean;
    syncSourceKey?: string;
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
            enableGrammarCheck = true,
            syncSourceKey,
        },
        ref,
    ) => {
        // Keep a ref to availableDocuments so the extension can access the latest list
        const docsRef = useRef(availableDocuments);
        useEffect(() => {
            docsRef.current = availableDocuments;
        }, [availableDocuments]);

        // Stable document ID for the LanguageTool ignored-suggestions DB
        const documentId = useMemo(
            () => id || `rich-textarea-${Math.random().toString(36).slice(2)}`,
            [id],
        );

        const editor = useEditor({
            extensions: [
                StarterKit,
                DocumentReference.configure({
                    suggestion: createDocumentReferenceSuggestion({
                        availableDocuments: () => docsRef.current,
                        onReferenceClick,
                    }),
                }),
                ...(enableGrammarCheck
                    ? [
                          LanguageTool.configure({
                              language: "auto",
                              automaticMode: true,
                              documentId,
                          }),
                      ]
                    : []),
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

        // Hydrate content when the source document/field changes.
        const lastHydratedSourceKeyRef = useRef<string | null>(null);
        useEffect(() => {
            if (!editor) {
                return;
            }

            const nextSourceKey = syncSourceKey ?? id ?? "default";
            if (lastHydratedSourceKeyRef.current === nextSourceKey) {
                return;
            }

            if (editor.getHTML() !== value) {
                editor.commands.setContent(value);
            }

            lastHydratedSourceKeyRef.current = nextSourceKey;
        }, [editor, id, syncSourceKey, value]);

        return (
            <div className="rich-textarea-wrapper">
                <EditorContent editor={editor} />
                {enableGrammarCheck && editor && (
                    <LanguageToolPopup editor={editor} />
                )}
                {editor?.isEmpty && placeholder && (
                    <div className="rich-textarea-placeholder">
                        {placeholder}
                    </div>
                )}
            </div>
        );
    },
);

RichTextAreaInput.displayName = "RichTextAreaInput";
