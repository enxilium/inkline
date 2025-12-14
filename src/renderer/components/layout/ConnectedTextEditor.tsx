import React from "react";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";

import { useAppStore } from "../../state/appStore";
import { TextEditor } from "../workspace/TextEditor";
import { SearchAndReplace } from "../../tiptap/searchAndReplace";
import type {
    AutosaveStatus,
    WorkspaceChapter,
    WorkspaceScrapNote,
} from "../../types";

const AUTOSAVE_DELAY_MS = 1200;

interface ConnectedTextEditorProps {
    documentId: string;
    kind: "chapter" | "scrapNote";
}

export const ConnectedTextEditor: React.FC<ConnectedTextEditorProps> = ({
    documentId,
    kind,
}) => {
    const {
        projectId,
        chapters,
        scrapNotes,
        updateChapterLocally,
        updateScrapNoteLocally,
        setLastSavedAt,
        saveChapterContent,
        updateScrapNoteRemote,
    } = useAppStore();

    // 1. Resolve Data
    const documentData = React.useMemo(() => {
        if (kind === "chapter") {
            return chapters.find((c) => c.id === documentId);
        }
        return scrapNotes.find((n) => n.id === documentId);
    }, [chapters, scrapNotes, documentId, kind]);

    // 2. Local State
    const [autosaveStatus, setAutosaveStatus] =
        React.useState<AutosaveStatus>("idle");
    const [autosaveError, setAutosaveError] = React.useState<string | null>(
        null
    );

    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    // 3. Initialize Editor
    const editor = useEditor({
        extensions: [
            Color.configure({ types: ["textStyle"] }),
            TextStyle,
            FontFamily.configure({ types: ["textStyle"] }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            SearchAndReplace.configure({
                searchResultClass: "inkline-editor-search-result",
                selectedResultClass: "inkline-editor-search-result-selected",
                disableRegex: true,
            }),
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
                link: {
                    autolink: true,
                    linkOnPaste: true,
                    openOnClick: false,
                },
                underline: {},
            }),
        ],
        content: "<p></p>", // Initial empty, will be populated by useEffect
        editorProps: {
            attributes: {
                class: "editor-body",
                spellCheck: "true",
            },
        },
    });

    // 4. Sync Content (One-way: Store -> Editor)
    // We only sync if the editor is empty or if we just mounted.
    // We DO NOT sync on every store update to avoid cursor jumping,
    // unless we implement a complex diffing mechanism.
    // For now, we assume this component mounts when the tab opens.
    React.useEffect(() => {
        if (!editor || !documentData) return;

        const contentStr = documentData.content;
        const currentJSON = JSON.stringify(editor.getJSON());
        const targetContent =
            contentStr || JSON.stringify({ type: "doc", content: [] });

        try {
            const json = JSON.parse(targetContent);
            // Only set if significantly different (e.g. initial load)
            if (JSON.stringify(json) !== currentJSON) {
                // Check if editor is empty to avoid overwriting user work if store updates from elsewhere
                // For a robust system, we might need a "version" field.
                // For now, we trust the mount.
                if (
                    editor.isEmpty ||
                    currentJSON ===
                        '{"type":"doc","content":[{"type":"paragraph"}]}'
                ) {
                    editor.commands.setContent(json, { emitUpdate: false });
                }
            }
        } catch (e) {
            const html = contentStr || "<p></p>";
            if (editor.getHTML() !== html) {
                editor.commands.setContent(html, { emitUpdate: false });
            }
        }
    }, [editor, documentId]); // Only run on mount/id change, not on data change to avoid loops

    // 5. Autosave Logic
    const flushAutosave = React.useCallback(async () => {
        if (!projectId || !editor || !documentData) {
            return;
        }

        try {
            setAutosaveStatus("saving");
            setAutosaveError(null);

            const content = JSON.stringify(editor.getJSON());

            if (kind === "chapter") {
                await saveChapterContent({
                    chapterId: documentId,
                    content,
                });
                updateChapterLocally(documentId, {
                    content,
                    updatedAt: new Date(),
                });
            } else {
                await updateScrapNoteRemote({
                    scrapNoteId: documentId,
                    content,
                });
                updateScrapNoteLocally(documentId, {
                    content,
                    updatedAt: new Date(),
                });
            }

            setAutosaveStatus("saved");
            setLastSavedAt(Date.now());
        } catch (error) {
            setAutosaveStatus("error");
            setAutosaveError((error as Error)?.message ?? "Autosave failed.");
        }
    }, [
        projectId,
        editor,
        documentData,
        kind,
        documentId,
        updateChapterLocally,
        updateScrapNoteLocally,
        setLastSavedAt,
        saveChapterContent,
        updateScrapNoteRemote,
    ]);

    const scheduleAutosave = React.useCallback(() => {
        setAutosaveStatus("pending");
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }
        autosaveTimerRef.current = setTimeout(() => {
            flushAutosave();
        }, AUTOSAVE_DELAY_MS);
    }, [flushAutosave]);

    React.useEffect(() => {
        if (!editor) return;
        const autosaveListener = () => {
            scheduleAutosave();

            // Keep store state hot so we can flush saves on navigation.
            const content = JSON.stringify(editor.getJSON());
            if (kind === "chapter") {
                updateChapterLocally(documentId, {
                    content,
                    updatedAt: new Date(),
                });
            } else {
                updateScrapNoteLocally(documentId, {
                    content,
                    updatedAt: new Date(),
                });
            }
        };
        editor.on("update", autosaveListener);
        return () => {
            editor.off("update", autosaveListener);
        };
    }, [
        editor,
        scheduleAutosave,
        kind,
        documentId,
        updateChapterLocally,
        updateScrapNoteLocally,
    ]);

    // Cleanup timer
    React.useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        };
    }, []);

    // 7. Render
    if (!documentData) {
        return <div className="empty-editor">Document not found.</div>;
    }

    const autosaveLabel = React.useMemo(() => {
        switch (autosaveStatus) {
            case "saving":
                return "Autosaving…";
            case "pending":
                return "Queued";
            case "saved":
                return "Saved";
            case "error":
                return "Autosave failed";
            default:
                return "";
        }
    }, [autosaveStatus]);

    const autosaveClass = React.useMemo(() => {
        switch (autosaveStatus) {
            case "saving":
            case "pending":
                return "is-warning";
            case "saved":
                return "is-success";
            case "error":
                return "is-error";
            default:
                return "";
        }
    }, [autosaveStatus]);

    return (
        <TextEditor
            editor={editor}
            autosaveLabel={autosaveLabel}
            autosaveClass={autosaveClass}
        />
    );
};
