import React from "react";
import type { Editor } from "@tiptap/react";
import { CloseIcon, TrashIcon } from "../ui/Icons";

export interface InlineCommentEntry {
    commentId: string;
    commentText: string;
    createdAt: string;
    excerpt: string;
    from: number;
    to: number;
}

/** Extract every unique inline-comment mark from the document. */
export const extractInlineComments = (editor: Editor): InlineCommentEntry[] => {
    const markType = editor.schema.marks.inlineComment;
    if (!markType) return [];

    const byId = new Map<string, InlineCommentEntry>();

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
                // Extend range and excerpt for the same comment spanning multiple text nodes.
                existing.to = pos + node.nodeSize;
                existing.excerpt += node.text ?? "";
            } else {
                byId.set(id, {
                    commentId: id,
                    commentText: attrs.commentText ?? "",
                    createdAt: attrs.createdAt ?? "",
                    excerpt: node.text ?? "",
                    from: pos,
                    to: pos + node.nodeSize,
                });
            }
        }
    });

    return [...byId.values()].sort((a, b) => a.from - b.from);
};

interface CommentsSidebarProps {
    editor: Editor;
    onClose: () => void;
    /** When the React layer wants to open the comment input for the current selection. */
    pendingCommentRequest: boolean;
    onCommentRequestHandled: () => void;
}

export const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
    editor,
    onClose,
    pendingCommentRequest,
    onCommentRequestHandled,
}) => {
    const [comments, setComments] = React.useState<InlineCommentEntry[]>([]);
    const [draftText, setDraftText] = React.useState("");
    const [isAddingComment, setIsAddingComment] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [editText, setEditText] = React.useState("");
    const draftInputRef = React.useRef<HTMLTextAreaElement>(null);
    const editInputRef = React.useRef<HTMLTextAreaElement>(null);

    // Keep a snapshot of the selection when the user triggers "add comment"
    const selectionRef = React.useRef<{ from: number; to: number } | null>(
        null,
    );

    // Re-extract comments on any document or selection change.
    React.useEffect(() => {
        const refresh = () => setComments(extractInlineComments(editor));
        refresh();
        editor.on("update", refresh);
        editor.on("selectionUpdate", refresh);
        return () => {
            editor.off("update", refresh);
            editor.off("selectionUpdate", refresh);
        };
    }, [editor]);

    // Handle external comment requests (keyboard shortcut / context menu).
    React.useEffect(() => {
        if (!pendingCommentRequest) return;
        onCommentRequestHandled();

        const { from, to } = editor.state.selection;
        if (from === to) return; // need a selection

        selectionRef.current = { from, to };
        setIsAddingComment(true);
        setDraftText("");

        requestAnimationFrame(() => draftInputRef.current?.focus());
    }, [pendingCommentRequest, editor, onCommentRequestHandled]);

    const submitComment = React.useCallback(() => {
        const text = draftText.trim();
        if (!text || !selectionRef.current) return;

        const { from, to } = selectionRef.current;
        const commentId = crypto.randomUUID();

        editor
            .chain()
            .focus()
            .setTextSelection({ from, to })
            .setInlineComment({
                commentId,
                commentText: text,
                createdAt: new Date().toISOString(),
            })
            .run();

        setDraftText("");
        setIsAddingComment(false);
        selectionRef.current = null;
    }, [draftText, editor]);

    const deleteComment = React.useCallback(
        (commentId: string) => {
            editor.commands.removeInlineComment(commentId);
        },
        [editor],
    );

    const startEdit = React.useCallback((entry: InlineCommentEntry) => {
        setEditingId(entry.commentId);
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
        (entry: InlineCommentEntry) => {
            editor.chain().focus().setTextSelection(entry.from).run();

            // Scroll the marked text into view.
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

    return (
        <div className="comments-sidebar">
            <div className="comments-sidebar-header">
                <span className="comments-sidebar-title">Comments</span>
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

            {isAddingComment ? (
                <div className="comments-sidebar-add">
                    <textarea
                        ref={draftInputRef}
                        className="comments-sidebar-textarea"
                        placeholder="Write your comment..."
                        value={draftText}
                        onChange={(e) => setDraftText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                submitComment();
                            }
                            if (e.key === "Escape") {
                                setIsAddingComment(false);
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
                                selectionRef.current = null;
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : null}

            {comments.length === 0 && !isAddingComment ? (
                <div className="comments-sidebar-empty">
                    <p>No comments yet.</p>
                    <p className="comments-sidebar-hint">
                        Select text and press <kbd>Ctrl+Shift+M</kbd> or
                        right-click to add a comment.
                    </p>
                </div>
            ) : (
                <div className="comments-sidebar-list">
                    {comments.map((entry) => (
                        <div
                            key={entry.commentId}
                            className="comments-sidebar-card"
                            onClick={() => scrollToComment(entry)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") scrollToComment(entry);
                            }}
                        >
                            <div className="comments-sidebar-card-excerpt">
                                &ldquo;
                                {entry.excerpt.length > 80
                                    ? entry.excerpt.slice(0, 80) + "…"
                                    : entry.excerpt}
                                &rdquo;
                            </div>

                            {editingId === entry.commentId ? (
                                <div className="comments-sidebar-edit-form">
                                    <textarea
                                        ref={editInputRef}
                                        className="comments-sidebar-textarea"
                                        value={editText}
                                        onChange={(e) =>
                                            setEditText(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                (e.ctrlKey || e.metaKey)
                                            ) {
                                                e.preventDefault();
                                                submitEdit();
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
                                                submitEdit();
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
                            ) : (
                                <div className="comments-sidebar-card-text">
                                    {entry.commentText}
                                </div>
                            )}

                            <div className="comments-sidebar-card-meta">
                                <span className="comments-sidebar-card-date">
                                    {formatDate(entry.createdAt)}
                                </span>
                                <div className="comments-sidebar-card-actions">
                                    <button
                                        type="button"
                                        className="btn btn-icon btn-xs"
                                        title="Edit comment"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            startEdit(entry);
                                        }}
                                    >
                                        ✎
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-icon btn-xs"
                                        title="Delete comment"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteComment(entry.commentId);
                                        }}
                                    >
                                        <TrashIcon size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
