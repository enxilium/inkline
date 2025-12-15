import React from "react";
import { useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import CommentExtension from "@sereneinserenade/tiptap-comment-extension";

import { useAppStore } from "../../state/appStore";
import { TextEditor } from "../workspace/TextEditor";
import { SearchAndReplace } from "../../tiptap/searchAndReplace";
import type { AutosaveStatus } from "../../types";
import {
    extractWordsWithPositions,
    hasCommentId,
    normalizeEditText,
    sanitizeReplacementText,
    stripCommentMarksFromTiptapJSON,
} from "../../tiptap/comments";
import { Button } from "../ui/Button";
import { CheckIcon, CloseIcon } from "../ui/Icons";

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
        activeDocument,
        chapters,
        scrapNotes,
        updateChapterLocally,
        updateScrapNoteLocally,
        setAutosaveStatus: setGlobalAutosaveStatus,
        setAutosaveError: setGlobalAutosaveError,
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

    const isActiveEditor =
        activeDocument?.kind === kind && activeDocument.id === documentId;

    React.useEffect(() => {
        if (!isActiveEditor) {
            return;
        }

        setGlobalAutosaveStatus(autosaveStatus);
        setGlobalAutosaveError(autosaveError);
    }, [
        autosaveError,
        autosaveStatus,
        isActiveEditor,
        setGlobalAutosaveError,
        setGlobalAutosaveStatus,
    ]);

    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const pendingEditsByChapterId = useAppStore(
        (state) => state.pendingEditsByChapterId
    );
    const pendingEditsById = useAppStore((state) => state.pendingEditsById);
    const archivedEditsById = useAppStore((state) => state.archivedEditsById);
    const archivePendingEdit = useAppStore((state) => state.archivePendingEdit);
    const restoreArchivedEdit = useAppStore(
        (state) => state.restoreArchivedEdit
    );

    const [activeCommentId, setActiveCommentId] = React.useState<string | null>(
        null
    );

    const warnedEditsRef = React.useRef<Set<string>>(new Set());

    // If undo brings back a highlight, restore its edit payload from archive.
    React.useEffect(() => {
        if (!activeCommentId) {
            return;
        }

        if (pendingEditsById[activeCommentId]) {
            return;
        }

        if (archivedEditsById[activeCommentId]) {
            restoreArchivedEdit(activeCommentId);
        }
    }, [
        activeCommentId,
        archivedEditsById,
        pendingEditsById,
        restoreArchivedEdit,
    ]);

    // 3. Initialize Editor
    const editor = useEditor({
        extensions: [
            CommentExtension.configure({
                onCommentActivated: (commentId: string) => {
                    setActiveCommentId(commentId ? commentId : null);
                },
            }),
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

    // Apply pending edit marks (highlights) for chapters.
    React.useEffect(() => {
        if (!editor || kind !== "chapter") {
            return;
        }

        const bucket = pendingEditsByChapterId[documentId];
        if (!bucket) {
            return;
        }

        const commentMarkType = editor.schema.marks.comment;
        if (!commentMarkType) {
            return;
        }

        const words = extractWordsWithPositions(editor.state.doc);
        const rangeComments = bucket.comments.filter(
            (c) => c.wordNumberStart && c.wordNumberEnd
        );

        const rangeEdits = [...rangeComments, ...bucket.replacements];
        for (const edit of rangeEdits) {
            const wordNumberStart = (edit as { wordNumberStart?: number })
                .wordNumberStart;
            const wordNumberEnd = (edit as { wordNumberEnd?: number })
                .wordNumberEnd;

            if (!wordNumberStart || !wordNumberEnd) {
                continue;
            }

            const startIndex = wordNumberStart - 1;
            const endIndex = wordNumberEnd - 1;
            if (
                startIndex < 0 ||
                endIndex < startIndex ||
                endIndex >= words.length
            ) {
                if (!warnedEditsRef.current.has(edit.id)) {
                    console.debug(
                        "[EditChapters] Skipping pending edit (invalid word range)",
                        {
                            chapterId: documentId,
                            editId: edit.id,
                            kind: (edit as { kind?: string }).kind,
                            wordNumberStart,
                            wordNumberEnd,
                            totalWords: words.length,
                        }
                    );
                    warnedEditsRef.current.add(edit.id);
                }
                continue;
            }

            if ("originalText" in edit && edit.originalText) {
                const actualText = words
                    .slice(startIndex, endIndex + 1)
                    .map((w) => w.text)
                    .join(" ");
                if (
                    normalizeEditText(actualText) !==
                    normalizeEditText(edit.originalText)
                ) {
                    if (!warnedEditsRef.current.has(edit.id)) {
                        console.debug(
                            "[EditChapters] Skipping pending edit (originalText mismatch)",
                            {
                                chapterId: documentId,
                                editId: edit.id,
                                kind: (edit as { kind?: string }).kind,
                                wordNumberStart,
                                wordNumberEnd,
                                expectedOriginalText: edit.originalText,
                                actualText,
                                normalizedExpected: normalizeEditText(
                                    edit.originalText
                                ),
                                normalizedActual: normalizeEditText(actualText),
                            }
                        );
                        warnedEditsRef.current.add(edit.id);
                    }
                    continue;
                }
            }

            if (hasCommentId(editor.state.doc, commentMarkType, edit.id)) {
                continue;
            }

            const from = words[startIndex].from;
            const to = words[endIndex].to;
            const tr = editor.state.tr.addMark(
                from,
                to,
                commentMarkType.create({ commentId: edit.id })
            );
            editor.view.dispatch(tr);
        }
    }, [editor, kind, documentId, pendingEditsByChapterId]);

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

            const rawJson = editor.getJSON();
            const safeJson =
                kind === "chapter"
                    ? stripCommentMarksFromTiptapJSON(rawJson)
                    : rawJson;
            const content = JSON.stringify(safeJson);

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
            const rawJson = editor.getJSON();
            const safeJson =
                kind === "chapter"
                    ? stripCommentMarksFromTiptapJSON(rawJson)
                    : rawJson;
            const content = JSON.stringify(safeJson);
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

    const chapterBucket =
        kind === "chapter" ? pendingEditsByChapterId[documentId] : null;
    const chapterLevelComments = (chapterBucket?.comments ?? []).filter(
        (c) => !c.wordNumberStart || !c.wordNumberEnd
    );

    const activeEdit =
        activeCommentId && pendingEditsById[activeCommentId]
            ? pendingEditsById[activeCommentId]
            : null;

    const bubblePosition = React.useMemo(() => {
        if (!editor || !activeEdit) {
            return null;
        }

        try {
            const coords = editor.view.coordsAtPos(editor.state.selection.from);
            const width = 320;
            const left = Math.min(coords.left, window.innerWidth - width - 16);
            const top = Math.min(coords.bottom + 8, window.innerHeight - 120);
            return { left, top, width };
        } catch {
            return null;
        }
    }, [editor, activeEdit]);

    const jumpToNextHighlightedEdit = React.useCallback(
        (afterPos: number) => {
            if (!editor || kind !== "chapter") {
                return;
            }

            const commentMarkType = editor.state.schema.marks.comment;
            if (!commentMarkType) {
                return;
            }

            const positionsById = new Map<string, number>();
            editor.state.doc.descendants((node, pos) => {
                if (!node.isText || !node.marks?.length) {
                    return;
                }

                const commentMark = node.marks.find(
                    (mark) =>
                        mark.type === commentMarkType &&
                        typeof (mark.attrs as { commentId?: unknown })
                            ?.commentId === "string"
                );

                if (!commentMark) {
                    return;
                }

                const id = (commentMark.attrs as { commentId: string })
                    .commentId;
                if (!positionsById.has(id)) {
                    positionsById.set(id, pos);
                }
            });

            if (positionsById.size === 0) {
                setActiveCommentId(null);
                return;
            }

            const ordered = [...positionsById.entries()]
                .map(([id, pos]) => ({ id, pos }))
                .sort((a, b) => a.pos - b.pos);

            const next =
                ordered.find((item) => item.pos > afterPos) ?? ordered[0];

            const docSize = editor.state.doc.content.size;
            const targetPos = Math.max(1, Math.min(next.pos + 1, docSize));

            editor.chain().focus().setTextSelection(targetPos).run();

            // Ensure bubble opens even if the extension doesn't emit activation on programmatic selection.
            try {
                const resolved = editor.state.doc.resolve(targetPos);
                const markAtPos = resolved
                    .marks()
                    .find((m) => m.type === commentMarkType);
                const id =
                    markAtPos &&
                    typeof (markAtPos.attrs as { commentId?: unknown })
                        ?.commentId === "string"
                        ? (markAtPos.attrs as { commentId: string }).commentId
                        : null;
                setActiveCommentId(id);
            } catch {
                setActiveCommentId(null);
            }
        },
        [editor, kind]
    );

    const dismissComment = React.useCallback(
        (editId: string) => {
            const afterPos = editor ? editor.state.selection.from : 0;

            if (editor) {
                (
                    editor.commands as unknown as {
                        unsetComment?: (id: string) => void;
                    }
                ).unsetComment?.(editId);
            }
            archivePendingEdit(editId);

            // After dismiss/reject, jump to next edit highlight.
            jumpToNextHighlightedEdit(afterPos);
        },
        [archivePendingEdit, editor, jumpToNextHighlightedEdit]
    );

    const acceptReplacement = React.useCallback(
        (editId: string, replacementText: string) => {
            if (!editor) {
                return;
            }

            const sanitizedReplacementText =
                sanitizeReplacementText(replacementText);
            if (!sanitizedReplacementText) {
                console.warn(
                    "[EditChapters] Skipping accept (empty replacement after sanitization)",
                    { editId }
                );
                return;
            }

            const afterPos = editor.state.selection.from;

            // Do replacement + mark removal in a single transaction, so one undo restores the suggestion.
            editor
                .chain()
                .focus()
                .command(({ tr, state }) => {
                    const commentMarkType = state.schema.marks.comment;
                    if (!commentMarkType) {
                        return true;
                    }

                    const markRanges: { from: number; to: number }[] = [];
                    state.doc.descendants((node, pos) => {
                        if (!node.isText || !node.marks?.length) {
                            return;
                        }

                        const has = node.marks.some(
                            (mark) =>
                                mark.type === commentMarkType &&
                                (mark.attrs as { commentId?: string })
                                    ?.commentId === editId
                        );

                        if (!has) {
                            return;
                        }

                        markRanges.push({
                            from: pos,
                            to: pos + node.nodeSize,
                        });
                    });

                    if (markRanges.length === 0) {
                        return true;
                    }

                    const from = Math.min(...markRanges.map((r) => r.from));
                    const to = Math.max(...markRanges.map((r) => r.to));

                    // Replace the marked range with plain text.
                    tr.replaceWith(
                        from,
                        to,
                        state.schema.text(sanitizedReplacementText)
                    );

                    // Remove any remaining marks for this commentId (in case text inherits marks).
                    const toRemove: {
                        mark: unknown;
                        from: number;
                        to: number;
                    }[] = [];
                    tr.doc.descendants((node, pos) => {
                        if (!node.isText || !node.marks?.length) {
                            return;
                        }
                        for (const mark of node.marks) {
                            if (
                                mark.type === commentMarkType &&
                                (mark.attrs as { commentId?: string })
                                    ?.commentId === editId
                            ) {
                                toRemove.push({
                                    mark,
                                    from: pos,
                                    to: pos + node.nodeSize,
                                });
                            }
                        }
                    });

                    for (const item of toRemove) {
                        tr.removeMark(item.from, item.to, item.mark as never);
                    }

                    return true;
                })
                .run();

            archivePendingEdit(editId);

            // After accept, jump to next edit highlight.
            jumpToNextHighlightedEdit(afterPos);
        },
        [archivePendingEdit, editor, jumpToNextHighlightedEdit]
    );

    return (
        <div className="connected-editor">
            {kind === "chapter" && chapterLevelComments.length > 0 ? (
                <div className="chapter-edits-banner">
                    <div className="chapter-edits-banner-title">
                        Pending chapter comments
                    </div>
                    <div className="chapter-edits-banner-list">
                        {chapterLevelComments.map((comment) => (
                            <div
                                key={comment.id}
                                className="chapter-edits-banner-item"
                            >
                                <div className="chapter-edits-banner-text">
                                    {comment.comment}
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => dismissComment(comment.id)}
                                >
                                    Dismiss
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <TextEditor
                editor={editor}
                autosaveLabel={autosaveLabel}
                autosaveClass={autosaveClass}
            />

            {kind === "chapter" && activeEdit && bubblePosition ? (
                <div
                    className="chapter-edit-bubble"
                    style={{
                        position: "fixed",
                        top: bubblePosition.top,
                        left: bubblePosition.left,
                        width: bubblePosition.width,
                    }}
                >
                    {activeEdit.kind === "comment" ? (
                        <>
                            <div className="chapter-edit-bubble-text">
                                {activeEdit.comment}
                            </div>
                            <div className="chapter-edit-bubble-actions">
                                <Button
                                    variant="ghost"
                                    onClick={() =>
                                        dismissComment(activeEdit.id)
                                    }
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="chapter-edit-bubble-replace">
                                Replace{" "}
                                <span className="chapter-edit-bubble-quote">
                                    {activeEdit.originalText}
                                </span>{" "}
                                with{" "}
                                <span className="chapter-edit-bubble-quote">
                                    {sanitizeReplacementText(
                                        activeEdit.replacementText
                                    ) || activeEdit.replacementText}
                                </span>
                            </div>

                            {activeEdit.comment ? (
                                <div className="chapter-edit-bubble-comment">
                                    <div className="chapter-edit-bubble-comment-label">
                                        Comment (optional)
                                    </div>
                                    <div className="chapter-edit-bubble-comment-text">
                                        {activeEdit.comment}
                                    </div>
                                </div>
                            ) : null}
                            <div className="chapter-edit-bubble-actions">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() =>
                                        acceptReplacement(
                                            activeEdit.id,
                                            activeEdit.replacementText
                                        )
                                    }
                                >
                                    <CheckIcon size={16} />
                                    Accept
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                        dismissComment(activeEdit.id)
                                    }
                                >
                                    <CloseIcon size={16} />
                                    Reject
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            ) : null}
        </div>
    );
};
