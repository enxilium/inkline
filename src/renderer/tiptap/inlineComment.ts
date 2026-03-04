import { Mark, mergeAttributes } from "@tiptap/core";

export interface InlineCommentOptions {
    HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        inlineComment: {
            /**
             * Set an inline comment mark on the current selection.
             */
            setInlineComment: (attrs: {
                commentId: string;
                commentText: string;
                createdAt: string;
            }) => ReturnType;
            /**
             * Remove a specific inline comment by ID.
             */
            removeInlineComment: (commentId: string) => ReturnType;
            /**
             * Update the comment text for an existing inline comment.
             */
            updateInlineComment: (
                commentId: string,
                commentText: string,
            ) => ReturnType;
        };
    }
}

export const InlineComment = Mark.create<InlineCommentOptions>({
    name: "inlineComment",

    addOptions() {
        return {
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            commentId: {
                default: null,
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute("data-inline-comment-id"),
                renderHTML: (attrs) => ({
                    "data-inline-comment-id": attrs.commentId as string,
                }),
            },
            commentText: {
                default: "",
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute(
                        "data-inline-comment-text",
                    ) ?? "",
                renderHTML: (attrs) => ({
                    "data-inline-comment-text": attrs.commentText as string,
                }),
            },
            createdAt: {
                default: "",
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute(
                        "data-inline-comment-created",
                    ) ?? "",
                renderHTML: (attrs) => ({
                    "data-inline-comment-created": attrs.createdAt as string,
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: "span[data-inline-comment-id]" }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: "inline-comment-mark",
            }),
            0,
        ];
    },

    addCommands() {
        return {
            setInlineComment:
                (attrs) =>
                ({ commands }) => {
                    return commands.setMark(this.name, attrs);
                },
            removeInlineComment:
                (commentId) =>
                ({ tr, state, dispatch }) => {
                    const markType = state.schema.marks[this.name];
                    if (!markType) return false;

                    const ranges: { from: number; to: number }[] = [];
                    state.doc.descendants((node, pos) => {
                        if (!node.isText || !node.marks?.length) return;
                        for (const mark of node.marks) {
                            if (
                                mark.type === markType &&
                                (mark.attrs as { commentId?: string })
                                    ?.commentId === commentId
                            ) {
                                ranges.push({
                                    from: pos,
                                    to: pos + node.nodeSize,
                                });
                            }
                        }
                    });

                    if (ranges.length === 0) return false;

                    if (dispatch) {
                        for (const range of ranges) {
                            tr.removeMark(range.from, range.to, markType);
                        }
                    }

                    return true;
                },
            updateInlineComment:
                (commentId, commentText) =>
                ({ tr, state, dispatch }) => {
                    const markType = state.schema.marks[this.name];
                    if (!markType) return false;

                    const ranges: {
                        from: number;
                        to: number;
                        mark: typeof tr.doc.type.schema.marks.inlineComment;
                    }[] = [];

                    state.doc.descendants((node, pos) => {
                        if (!node.isText || !node.marks?.length) return;
                        for (const mark of node.marks) {
                            if (
                                mark.type === markType &&
                                (mark.attrs as { commentId?: string })
                                    ?.commentId === commentId
                            ) {
                                ranges.push({
                                    from: pos,
                                    to: pos + node.nodeSize,
                                    mark: mark as never,
                                });
                            }
                        }
                    });

                    if (ranges.length === 0) return false;

                    if (dispatch) {
                        for (const range of ranges) {
                            tr.removeMark(
                                range.from,
                                range.to,
                                range.mark as never,
                            );
                            tr.addMark(
                                range.from,
                                range.to,
                                markType.create({
                                    commentId,
                                    commentText,
                                    createdAt: (
                                        range.mark as unknown as {
                                            attrs: { createdAt: string };
                                        }
                                    ).attrs.createdAt,
                                }),
                            );
                        }
                    }

                    return true;
                },
        };
    },

    addKeyboardShortcuts() {
        return {
            "Mod-Shift-m": () => {
                // Signal the React layer to open the comment input.
                // We fire a custom DOM event on the editor element.
                const dom = this.editor.view.dom;
                dom.dispatchEvent(
                    new CustomEvent("inline-comment-request", {
                        bubbles: true,
                    }),
                );
                return true;
            },
        };
    },
});
