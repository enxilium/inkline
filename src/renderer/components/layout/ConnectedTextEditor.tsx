import React from "react";
import { useEditor, Extension } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";
import CommentExtension from "@sereneinserenade/tiptap-comment-extension";

import { useAppStore } from "../../state/appStore";
import { TextEditor } from "../workspace/TextEditor";
import { SearchAndReplace } from "../../tiptap/searchAndReplace";
import { LanguageTool } from "../../tiptap/languageTool";
import {
    DocumentReference,
    createDocumentReferenceSuggestion,
} from "../../tiptap/documentReference";
import type { AutosaveStatus } from "../../types";
import type { DocumentRef } from "../ui/ListInput";
import {
    extractWordsWithPositions,
    hasCommentId,
    normalizeEditText,
    sanitizeReplacementText,
    stripCommentMarksFromTiptapJSON,
} from "../../tiptap/comments";
import { countWords } from "../../utils/textStats";
import { Button } from "../ui/Button";
import { CheckIcon, CloseIcon } from "../ui/Icons";

const AUTOSAVE_DELAY_MS = 1200;

const TabIndentation = Extension.create({
    name: "tabIndentation",

    addKeyboardShortcuts() {
        return {
            Tab: () => {
                if (this.editor.can().sinkListItem("listItem")) {
                    return this.editor.commands.sinkListItem("listItem");
                }
                return this.editor.commands.insertContent("\t");
            },
        };
    },
});

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
        characters,
        locations,
        organizations,
        updateChapterLocally,
        updateScrapNoteLocally,
        setAutosaveStatus: setGlobalAutosaveStatus,
        setAutosaveError: setGlobalAutosaveError,
        lastSavedAt,
        setLastSavedAt,
        setCurrentSelection,
        saveChapterContent,
        updateScrapNoteRemote,
        setActiveDocument,
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

    // Build available documents for slash-command references
    const availableDocuments: DocumentRef[] = React.useMemo(() => {
        const docs: DocumentRef[] = [];

        chapters.forEach((ch) => {
            docs.push({
                kind: "chapter",
                id: ch.id,
                name: ch.title || `Chapter ${ch.order}`,
            });
        });

        scrapNotes.forEach((sn) => {
            if (kind === "scrapNote" && sn.id === documentId) return; // Exclude self
            docs.push({
                kind: "scrapNote",
                id: sn.id,
                name: sn.title || "Untitled Note",
            });
        });

        characters.forEach((c) => {
            docs.push({
                kind: "character",
                id: c.id,
                name: c.name || "Unnamed Character",
            });
        });

        locations.forEach((loc) => {
            docs.push({
                kind: "location",
                id: loc.id,
                name: loc.name || "Unnamed Location",
            });
        });

        organizations.forEach((org) => {
            docs.push({
                kind: "organization",
                id: org.id,
                name: org.name || "Unnamed Organization",
            });
        });

        return docs;
    }, [
        chapters,
        scrapNotes,
        characters,
        locations,
        organizations,
        kind,
        documentId,
    ]);

    // Handle reference click - navigate to the referenced document
    const handleReferenceClick = React.useCallback(
        (ref: DocumentRef) => {
            setActiveDocument({ kind: ref.kind, id: ref.id });
        },
        [setActiveDocument]
    );

    // Create document reference suggestion with current available docs
    const documentReferenceSuggestion = React.useMemo(
        () =>
            createDocumentReferenceSuggestion({
                availableDocuments,
                onReferenceClick: handleReferenceClick,
            }),
        [availableDocuments, handleReferenceClick]
    );

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
        onSelectionUpdate: ({ editor }) => {
            const { from, to, empty } = editor.state.selection;
            if (empty) {
                setCurrentSelection(null);
                return;
            }

            const text = editor.state.doc.textBetween(from, to, " ");
            if (!text.trim()) {
                setCurrentSelection(null);
                return;
            }

            const textBefore = editor.state.doc.textBetween(0, from, " ");
            const wordsBefore = countWords(textBefore);
            const wordsInSelection = countWords(text);

            const start = wordsBefore + 1;
            const end = wordsBefore + wordsInSelection;

            const title = documentData?.title || "Untitled";

            setCurrentSelection({
                text,
                range: `${title} ${start}-${end}`,
            });
        },
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
            LanguageTool.configure({
                language: "auto",
                automaticMode: true,
                documentId: documentId,
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
            // Only enable document references for scrap notes, not chapters
            ...(kind === "scrapNote"
                ? [
                      DocumentReference.configure({
                          suggestion: documentReferenceSuggestion,
                      }),
                  ]
                : []),
            TabIndentation,
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
    // We only sync if the editor is empty, if we just mounted, OR if an external update occurred.
    React.useEffect(() => {
        if (!editor || !documentData) return;

        const contentStr = documentData.content;
        const currentJSON = JSON.stringify(editor.getJSON());
        const targetContent =
            contentStr || JSON.stringify({ type: "doc", content: [] });

        const docTime = new Date(documentData.updatedAt).getTime();
        const lastSave = lastSavedAt || 0;
        // If the document is newer than our last save, treat as external update
        // We use a small buffer to avoid race conditions with local autosave
        const isExternalUpdate = docTime > lastSave + 50;
        const isInitialLoad =
            editor.isEmpty ||
            currentJSON === '{"type":"doc","content":[{"type":"paragraph"}]}';

        if (isExternalUpdate || isInitialLoad) {
            try {
                const json = JSON.parse(targetContent);
                // Only set if significantly different
                if (JSON.stringify(json) !== currentJSON) {
                    editor.commands.setContent(json, { emitUpdate: false });
                    if (isExternalUpdate) {
                        setLastSavedAt(docTime);
                    }
                }
            } catch (e) {
                const html = contentStr || "<p></p>";
                if (editor.getHTML() !== html) {
                    editor.commands.setContent(html, { emitUpdate: false });
                    if (isExternalUpdate) {
                        setLastSavedAt(docTime);
                    }
                }
            }
        }
    }, [editor, documentId, documentData?.updatedAt]); // Run on external updates too

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
            const scrollContainer = editor.view.dom.closest(".editor-body");

            if (!scrollContainer) {
                return null;
            }

            const containerRect = scrollContainer.getBoundingClientRect();
            const width = 320;

            // Calculate position relative to the editor body
            const top = coords.bottom - containerRect.top + 8;
            const left = coords.left - containerRect.left;

            // Ensure it doesn't overflow the right edge of the container
            const maxLeft = scrollContainer.scrollWidth - width - 16;
            const adjustedLeft = Math.min(left, maxLeft);

            return { left: adjustedLeft, top, width };
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

    // Listen for document reference clicks from the editor
    React.useEffect(() => {
        const editorElement = editor?.view?.dom;
        if (!editorElement) return;

        const handleDocRefClick = (e: Event) => {
            const customEvent = e as CustomEvent<DocumentRef>;
            if (customEvent.detail) {
                handleReferenceClick(customEvent.detail);
            }
        };

        editorElement.addEventListener(
            "document-reference-click",
            handleDocRefClick
        );

        return () => {
            editorElement.removeEventListener(
                "document-reference-click",
                handleDocRefClick
            );
        };
    }, [editor, handleReferenceClick]);

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
            >
                {kind === "chapter" && activeEdit && bubblePosition ? (
                    <div
                        className="chapter-edit-bubble"
                        style={{
                            position: "absolute",
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
            </TextEditor>
        </div>
    );
};
