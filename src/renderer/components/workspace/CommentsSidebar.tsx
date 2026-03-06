import React from "react";
import type { Editor } from "@tiptap/react";
import { CheckIcon, CloseIcon, TrashIcon } from "../ui/Icons";
import { Button } from "../ui/Button";
import type {
    PendingChapterCommentEdit,
    PendingChapterEdit,
    PendingChapterReplacementEdit,
} from "../../state/appStore";
import { sanitizeReplacementText } from "../../tiptap/comments";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Unified comment entry shown in the sidebar.
 * Both user inline comments and AI edits produce these.
 */
export interface UnifiedCommentEntry {
    /** Unique identifier (the mark's commentId for user, or the edit's id for AI). */
    id: string;
    author: "user" | "ai";
    /** For AI edits: "comment" or "replacement". User comments are always "comment". */
    editKind: "comment" | "replacement";
    /** The comment body text. */
    commentText: string;
    /** Highlighted document text (empty for chapter-level). */
    excerpt: string;
    /** Document position of the highlighted text (Infinity for chapter-level). */
    from: number;
    to: number;
    /** ISO timestamp. */
    createdAt: string;
    /** For AI replacements only. */
    originalText?: string;
    replacementText?: string;
    /** Whether this is a chapter-level comment with no anchored text. */
    isChapterLevel: boolean;
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

/** Extract user inline-comment marks from the document. */
const extractUserComments = (editor: Editor): UnifiedCommentEntry[] => {
    const markType = editor.schema.marks.inlineComment;
    if (!markType) return [];

    const byId = new Map<string, UnifiedCommentEntry>();

    editor.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.marks?.length) return;

        for (const mark of node.marks) {
            if (mark.type !== markType) continue;

            const attrs = mark.attrs as {
                commentId?: string;
                commentText?: string;
                createdAt?: string;
            };
            const id = attrs.commentId;
            if (!id) continue;

            const existing = byId.get(id);
            if (existing) {
                existing.to = pos + node.nodeSize;
                existing.excerpt += node.text ?? "";
            } else {
                byId.set(id, {
                    id,
                    author: "user",
                    editKind: "comment",
                    commentText: attrs.commentText ?? "",
                    excerpt: node.text ?? "",
                    from: pos,
                    to: pos + node.nodeSize,
                    createdAt: attrs.createdAt ?? "",
                    isChapterLevel: false,
                });
            }
        }
    });

    return [...byId.values()];
};

/** Extract AI edit marks from the document, enriched with data from the pending edits store. */
const extractAIComments = (
    editor: Editor,
    pendingEditsById: Record<string, PendingChapterEdit>,
): UnifiedCommentEntry[] => {
    const markType = editor.schema.marks.comment;
    if (!markType) return [];

    const byId = new Map<string, UnifiedCommentEntry>();

    editor.state.doc.descendants((node, pos) => {
        if (!node.isText || !node.marks?.length) return;

        for (const mark of node.marks) {
            if (mark.type !== markType) continue;

            const commentId = (mark.attrs as { commentId?: string })
                ?.commentId;
            if (!commentId) continue;

            const pendingEdit = pendingEditsById[commentId];
            if (!pendingEdit) continue; // archived / unknown — skip

            const existing = byId.get(commentId);
            if (existing) {
                existing.to = pos + node.nodeSize;
                existing.excerpt += node.text ?? "";
            } else {
                const isReplacement = pendingEdit.kind === "replacement";
                const commentText = isReplacement
                    ? (pendingEdit as PendingChapterReplacementEdit).comment ??
                      ""
                    : (pendingEdit as PendingChapterCommentEdit).comment;

                byId.set(commentId, {
                    id: commentId,
                    author: "ai",
                    editKind: pendingEdit.kind,
                    commentText,
                    excerpt: node.text ?? "",
                    from: pos,
                    to: pos + node.nodeSize,
                    createdAt: new Date(pendingEdit.createdAt).toISOString(),
                    originalText: isReplacement
                        ? (pendingEdit as PendingChapterReplacementEdit)
                              .originalText
                        : undefined,
                    replacementText: isReplacement
                        ? (pendingEdit as PendingChapterReplacementEdit)
                              .replacementText
                        : undefined,
                    isChapterLevel: false,
                });
            }
        }
    });

    return [...byId.values()];
};

/** Build chapter-level AI comment entries (no word range). */
const buildChapterLevelAIComments = (
    chapterLevelEdits: PendingChapterCommentEdit[],
): UnifiedCommentEntry[] => {
    return chapterLevelEdits.map((edit) => ({
        id: edit.id,
        author: "ai" as const,
        editKind: "comment" as const,
        commentText: edit.comment,
        excerpt: "",
        from: Infinity,
        to: Infinity,
        createdAt: new Date(edit.createdAt).toISOString(),
        isChapterLevel: true,
    }));
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface UserChapterComment {
    id: string;
    text: string;
    createdAt: string;
}

interface CommentsSidebarProps {
    editor: Editor;
    onClose: () => void;
    /** When the React layer wants to open the comment input for the current selection. */
    pendingCommentRequest: boolean;
    onCommentRequestHandled: () => void;
    /** AI pending edits by ID (for enriching AI comment marks). */
    pendingEditsById: Record<string, PendingChapterEdit>;
    /** Chapter-level AI comments (no word range). */
    chapterLevelAIComments: PendingChapterCommentEdit[];
    /** User chapter-level comments. */
    userChapterComments: UserChapterComment[];
    onAddUserChapterComment: (text: string) => void;
    onRemoveUserChapterComment: (id: string) => void;
    /** Called when an AI edit (comment or replacement) should be dismissed/rejected. */
    onDismissAIEdit: (editId: string) => void;
    /** Called when an AI replacement should be accepted. */
    onAcceptReplacement: (editId: string, replacementText: string) => void;
    /** The ID of the comment mark the cursor is currently inside (from CommentExtension). */
    activeCommentId: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
    editor,
    onClose,
    pendingCommentRequest,
    onCommentRequestHandled,
    pendingEditsById,
    chapterLevelAIComments,
    userChapterComments,
    onAddUserChapterComment,
    onRemoveUserChapterComment,
    onDismissAIEdit,
    onAcceptReplacement,
    activeCommentId,
}) => {
    const [entries, setEntries] = React.useState<UnifiedCommentEntry[]>([]);
    const [draftText, setDraftText] = React.useState("");
    const [isAddingComment, setIsAddingComment] = React.useState(false);
    const [isChapterLevelDraft, setIsChapterLevelDraft] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editText, setEditText] = React.useState("");
    const draftInputRef = React.useRef<HTMLTextAreaElement>(null);
    const editInputRef = React.useRef<HTMLTextAreaElement>(null);
    const activeCardRef = React.useRef<HTMLDivElement>(null);

    const selectionRef = React.useRef<{ from: number; to: number } | null>(
        null,
    );

    // Re-extract all comments whenever the document, pending edits, or chapter-level comments change.
    React.useEffect(() => {
        const refresh = () => {
            const user = extractUserComments(editor);
            const ai = extractAIComments(editor, pendingEditsById);
            const chapterAI = buildChapterLevelAIComments(
                chapterLevelAIComments,
            );
            const chapterUser: UnifiedCommentEntry[] =
                userChapterComments.map((c) => ({
                    id: c.id,
                    author: "user",
                    editKind: "comment",
                    commentText: c.text,
                    excerpt: "",
                    from: Infinity,
                    to: Infinity,
                    createdAt: c.createdAt,
                    isChapterLevel: true,
                }));

            const all = [...chapterAI, ...chapterUser, ...user, ...ai];
            // Sort: chapter-level first, then by document position.
            all.sort((a, b) => {
                if (a.isChapterLevel !== b.isChapterLevel) {
                    return a.isChapterLevel ? -1 : 1;
                }
                return a.from - b.from;
            });

            setEntries(all);
        };

        refresh();
        editor.on("update", refresh);
        editor.on("selectionUpdate", refresh);
        return () => {
            editor.off("update", refresh);
            editor.off("selectionUpdate", refresh);
        };
    }, [
        editor,
        pendingEditsById,
        chapterLevelAIComments,
        userChapterComments,
    ]);

    // Auto-scroll to active comment card when cursor enters a highlight.
    React.useEffect(() => {
        if (!activeCommentId) return;
        requestAnimationFrame(() => {
            activeCardRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        });
    }, [activeCommentId]);

    // Handle external comment requests (keyboard shortcut / context menu).
    React.useEffect(() => {
        if (!pendingCommentRequest) return;
        onCommentRequestHandled();

        const { from, to } = editor.state.selection;
        if (from === to) {
            // No selection — open chapter-level comment draft.
            setIsChapterLevelDraft(true);
            selectionRef.current = null;
        } else {
            setIsChapterLevelDraft(false);
            selectionRef.current = { from, to };
        }

        setIsAddingComment(true);
        setDraftText("");
        requestAnimationFrame(() => draftInputRef.current?.focus());
    }, [pendingCommentRequest, editor, onCommentRequestHandled]);

    const submitComment = React.useCallback(() => {
        const text = draftText.trim();
        if (!text) return;

        if (isChapterLevelDraft) {
            onAddUserChapterComment(text);
        } else {
            if (!selectionRef.current) return;
            const { from, to } = selectionRef.current;
            editor
                .chain()
                .focus()
                .setTextSelection({ from, to })
                .setInlineComment({
                    commentId: crypto.randomUUID(),
                    commentText: text,
                    createdAt: new Date().toISOString(),
                })
                .run();
        }

        setDraftText("");
        setIsAddingComment(false);
        setIsChapterLevelDraft(false);
        selectionRef.current = null;
    }, [draftText, editor, isChapterLevelDraft, onAddUserChapterComment]);

    const deleteUserComment = React.useCallback(
        (entry: UnifiedCommentEntry) => {
            if (entry.isChapterLevel) {
                onRemoveUserChapterComment(entry.id);
            } else {
                editor.commands.removeInlineComment(entry.id);
            }
        },
        [editor, onRemoveUserChapterComment],
    );

    const startEdit = React.useCallback((entry: UnifiedCommentEntry) => {
        setEditingId(entry.id);
        setEditText(entry.commentText);
        requestAnimationFrame(() => editInputRef.current?.focus());
    }, []);

    const submitEdit = React.useCallback(() => {
        if (!editingId) return;
        const text = editText.trim();
        if (!text) return;
        editor.commands.updateInlineComment(editingId, text);
        setEditingId(null);
        setEditText("");
    }, [editingId, editText, editor]);

    const scrollToComment = React.useCallback(
        (entry: UnifiedCommentEntry) => {
            if (entry.isChapterLevel) return;

            editor.chain().focus().setTextSelection(entry.from).run();

            const coords = editor.view.coordsAtPos(entry.from);
            const scrollContainer = editor.view.dom.closest(".editor-scroll");
            if (scrollContainer) {
                const containerRect = scrollContainer.getBoundingClientRect();
                const offset = coords.top - containerRect.top - 100;
                scrollContainer.scrollBy({ top: offset, behavior: "smooth" });
            }
        },
        [editor],
    );

    const formatDate = (iso: string) => {
        if (!iso) return "";
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "";
        }
    };

    const startNewComment = React.useCallback(() => {
        const { from, to } = editor.state.selection;
        if (from === to) {
            setIsChapterLevelDraft(true);
            selectionRef.current = null;
        } else {
            setIsChapterLevelDraft(false);
            selectionRef.current = { from, to };
        }
        setIsAddingComment(true);
        setDraftText("");
        requestAnimationFrame(() => draftInputRef.current?.focus());
    }, [editor]);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    const hasChapterLevel = entries.some((e) => e.isChapterLevel);
    const chapterLevelEntries = entries.filter((e) => e.isChapterLevel);
    const anchoredEntries = entries.filter((e) => !e.isChapterLevel);

    return (
        <div className="comments-sidebar">
            {/* Header */}
            <div className="comments-sidebar-header">
                <span className="comments-sidebar-title">Comments</span>
                <div className="comments-sidebar-header-actions">
                    <button
                        type="button"
                        className="btn btn-icon btn-xs"
                        onClick={startNewComment}
                        title="New comment"
                        aria-label="New comment"
                    >
                        +
                    </button>
                    <button
                        type="button"
                        className="btn btn-icon"
                        onClick={onClose}
                        title="Close comments"
                        aria-label="Close comments"
                    >
                        <CloseIcon size={14} />
                    </button>
                </div>
            </div>

            {/* Draft input */}
            {isAddingComment ? (
                <div className="comments-sidebar-add">
                    <div className="comments-sidebar-draft-label">
                        {isChapterLevelDraft
                            ? "Chapter note"
                            : "Comment on selection"}
                    </div>
                    <textarea
                        ref={draftInputRef}
                        className="comments-sidebar-textarea"
                        placeholder={
                            isChapterLevelDraft
                                ? "Write a chapter-level note..."
                                : "Write your comment..."
                        }
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                submitComment();
                            }
                            if (e.key === "Escape") {
                                setIsAddingComment(false);
                                setIsChapterLevelDraft(false);
                                selectionRef.current = null;
                            }
                        }}
                        rows={3}
                    />
                    <div className="comments-sidebar-add-actions">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={!draftText.trim()}
                            onClick={submitComment}
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => {
                                setIsAddingComment(false);
                                setIsChapterLevelDraft(false);
                                selectionRef.current = null;
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Empty state */}
            {entries.length === 0 && !isAddingComment ? (
                <div className="comments-sidebar-empty">
                    <p>No comments yet.</p>
                    <p className="comments-sidebar-hint">
                        Select text and press <kbd>Ctrl+Shift+M</kbd> to
                        comment, or click <strong>+</strong> for a chapter note.
                    </p>
                </div>
            ) : null}

            {/* Scrollable list */}
            {entries.length > 0 ? (
                <div className="comments-sidebar-list">
                    {/* Chapter-level section */}
                    {hasChapterLevel ? (
                        <>
                            <div className="comments-sidebar-section-label">
                                Chapter notes
                            </div>
                            {chapterLevelEntries.map((entry) => (
                                <CommentCard
                                    key={entry.id}
                                    entry={entry}
                                    isActive={activeCommentId === entry.id}
                                    activeCardRef={
                                        activeCommentId === entry.id
                                            ? activeCardRef
                                            : undefined
                                    }
                                    editingId={editingId}
                                    editText={editText}
                                    editInputRef={editInputRef}
                                    setEditText={setEditText}
                                    setEditingId={setEditingId}
                                    onScrollTo={scrollToComment}
                                    onStartEdit={startEdit}
                                    onSubmitEdit={submitEdit}
                                    onDeleteUser={deleteUserComment}
                                    onDismissAI={onDismissAIEdit}
                                    onAcceptReplacement={onAcceptReplacement}
                                    formatDate={formatDate}
                                />
                            ))}
                        </>
                    ) : null}

                    {/* Anchored comments */}
                    {anchoredEntries.length > 0 && hasChapterLevel ? (
                        <div className="comments-sidebar-section-label">
                            Inline comments
                        </div>
                    ) : null}
                    {anchoredEntries.map((entry) => (
                        <CommentCard
                            key={entry.id}
                            entry={entry}
                            isActive={activeCommentId === entry.id}
                            activeCardRef={
                                activeCommentId === entry.id
                                    ? activeCardRef
                                    : undefined
                            }
                            editingId={editingId}
                            editText={editText}
                            editInputRef={editInputRef}
                            setEditText={setEditText}
                            setEditingId={setEditingId}
                            onScrollTo={scrollToComment}
                            onStartEdit={startEdit}
                            onSubmitEdit={submitEdit}
                            onDeleteUser={deleteUserComment}
                            onDismissAI={onDismissAIEdit}
                            onAcceptReplacement={onAcceptReplacement}
                            formatDate={formatDate}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
};

// ---------------------------------------------------------------------------
// CommentCard — renders one unified comment entry
// ---------------------------------------------------------------------------

interface CommentCardProps {
    entry: UnifiedCommentEntry;
    isActive: boolean;
    activeCardRef?: React.RefObject<HTMLDivElement | null>;
    editingId: string | null;
    editText: string;
    editInputRef: React.RefObject<HTMLTextAreaElement | null>;
    setEditText: (text: string) => void;
    setEditingId: (id: string | null) => void;
    onScrollTo: (entry: UnifiedCommentEntry) => void;
    onStartEdit: (entry: UnifiedCommentEntry) => void;
    onSubmitEdit: () => void;
    onDeleteUser: (entry: UnifiedCommentEntry) => void;
    onDismissAI: (editId: string) => void;
    onAcceptReplacement: (editId: string, replacementText: string) => void;
    formatDate: (iso: string) => string;
}

const CommentCard: React.FC<CommentCardProps> = ({
    entry,
    isActive,
    activeCardRef,
    editingId,
    editText,
    editInputRef,
    setEditText,
    setEditingId,
    onScrollTo,
    onStartEdit,
    onSubmitEdit,
    onDeleteUser,
    onDismissAI,
    onAcceptReplacement,
    formatDate,
}) => {
    const isEditing = editingId === entry.id;
    const isClickable = !entry.isChapterLevel;

    const cardClass = [
        "comments-sidebar-card",
        isActive ? "comments-sidebar-card--active" : "",
        entry.author === "ai" ? "comments-sidebar-card--ai" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            ref={activeCardRef}
            className={cardClass}
            onClick={isClickable ? () => onScrollTo(entry) : undefined}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={
                isClickable
                    ? (e) => {
                          if (e.key === "Enter") onScrollTo(entry);
                      }
                    : undefined
            }
        >
            {/* Author badge */}
            <div className="comments-sidebar-card-header">
                <span
                    className={`comments-sidebar-card-badge ${entry.author === "ai" ? "comments-sidebar-card-badge--ai" : "comments-sidebar-card-badge--user"}`}
                >
                    {entry.author === "ai" ? "AI" : "You"}
                </span>
                <span className="comments-sidebar-card-date">
                    {formatDate(entry.createdAt)}
                </span>
            </div>

            {/* Excerpt (anchored comments only) */}
            {entry.excerpt ? (
                <div className="comments-sidebar-card-excerpt">
                    &ldquo;
                    {entry.excerpt.length > 80
                        ? entry.excerpt.slice(0, 80) + "…"
                        : entry.excerpt}
                    &rdquo;
                </div>
            ) : null}

            {/* AI replacement block */}
            {entry.editKind === "replacement" &&
            entry.originalText &&
            entry.replacementText ? (
                <div className="comments-sidebar-replacement">
                    <span className="comments-sidebar-replacement-label">
                        Replace
                    </span>{" "}
                    <span className="comments-sidebar-replacement-quote">
                        {entry.originalText}
                    </span>{" "}
                    <span className="comments-sidebar-replacement-label">
                        with
                    </span>{" "}
                    <span className="comments-sidebar-replacement-quote">
                        {sanitizeReplacementText(entry.replacementText) ||
                            entry.replacementText}
                    </span>
                </div>
            ) : null}

            {/* Comment text */}
            {isEditing ? (
                <div className="comments-sidebar-edit-form">
                    <textarea
                        ref={editInputRef}
                        className="comments-sidebar-textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                            if (
                                e.key === "Enter" &&
                                (e.ctrlKey || e.metaKey)
                            ) {
                                e.preventDefault();
                                onSubmitEdit();
                            }
                            if (e.key === "Escape") {
                                setEditingId(null);
                            }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        rows={2}
                    />
                    <div className="comments-sidebar-add-actions">
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={!editText.trim()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSubmitEdit();
                            }}
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : entry.commentText ? (
                <div className="comments-sidebar-card-text">
                    {entry.commentText}
                </div>
            ) : null}

            {/* Actions */}
            <div className="comments-sidebar-card-actions-row">
                {entry.author === "user" ? (
                    <div className="comments-sidebar-card-actions">
                        {!entry.isChapterLevel ? (
                            <button
                                type="button"
                                className="btn btn-icon btn-xs"
                                title="Edit comment"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onStartEdit(entry);
                                }}
                            >
                                ✎
                            </button>
                        ) : null}
                        <button
                            type="button"
                            className="btn btn-icon btn-xs"
                            title="Delete comment"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteUser(entry);
                            }}
                        >
                            <TrashIcon size={13} />
                        </button>
                    </div>
                ) : null}

                {entry.author === "ai" ? (
                    <div className="comments-sidebar-card-actions">
                        {entry.editKind === "replacement" &&
                        entry.replacementText ? (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAcceptReplacement(
                                        entry.id,
                                        entry.replacementText!,
                                    );
                                }}
                            >
                                <CheckIcon size={14} />
                                Accept
                            </Button>
                        ) : null}
                        <Button
                            variant={
                                entry.editKind === "replacement"
                                    ? "secondary"
                                    : "ghost"
                            }
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDismissAI(entry.id);
                            }}
                        >
                            {entry.editKind === "replacement" ? (
                                <>
                                    <CloseIcon size={14} />
                                    Reject
                                </>
                            ) : (
                                "Dismiss"
                            )}
                        </Button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
