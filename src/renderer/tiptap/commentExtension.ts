import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface CommentExtensionOptions {
    /**
     * Called when a comment mark is activated (cursor enters it)
     * or deactivated (cursor leaves all comment marks).
     */
    onCommentActivated?: (commentId: string) => void;
    HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        comment: {
            /**
             * Set a comment mark on the current selection.
             */
            setComment: (commentId: string) => ReturnType;
            /**
             * Remove all comment marks with the given commentId from the document.
             */
            unsetComment: (commentId: string) => ReturnType;
        };
    }
}

const commentPluginKey = new PluginKey("commentActivation");

const CommentExtension = Mark.create<CommentExtensionOptions>({
    name: "comment",

    addOptions() {
        return {
            onCommentActivated: undefined,
            HTMLAttributes: {},
        };
    },

    addAttributes() {
        return {
            commentId: {
                default: null,
                parseHTML: (el) =>
                    (el as HTMLElement).getAttribute("data-comment-id"),
                renderHTML: (attrs) => {
                    if (!attrs.commentId) return {};
                    return { "data-comment-id": attrs.commentId as string };
                },
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: "span[data-comment-id]",
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
            0,
        ];
    },

    addCommands() {
        return {
            setComment:
                (commentId: string) =>
                ({ commands }) => {
                    return commands.setMark(this.name, { commentId });
                },

            unsetComment:
                (commentId: string) =>
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
                        for (const { from, to } of ranges) {
                            const mark = markType.create({ commentId });
                            tr.removeMark(from, to, mark);
                        }
                    }

                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        const onCommentActivated = this.options.onCommentActivated;
        if (!onCommentActivated) return [];

        const markName = this.name;

        return [
            new Plugin({
                key: commentPluginKey,
                state: {
                    init: () => "" as string,
                    apply(tr, oldActiveId, _oldState, newState) {
                        const { from } = newState.selection;
                        let currentId = "";

                        try {
                            const resolved = newState.doc.resolve(from);
                            const marks = resolved.marks();

                            for (const mark of marks) {
                                if (
                                    mark.type.name === markName &&
                                    typeof (
                                        mark.attrs as {
                                            commentId?: unknown;
                                        }
                                    )?.commentId === "string"
                                ) {
                                    currentId = (
                                        mark.attrs as { commentId: string }
                                    ).commentId;
                                    break;
                                }
                            }
                        } catch {
                            // Selection position may be invalid during doc changes
                        }

                        if (currentId !== oldActiveId) {
                            // Defer callback to avoid dispatching during apply
                            queueMicrotask(() =>
                                onCommentActivated(currentId),
                            );
                        }

                        return currentId;
                    },
                },
            }),
        ];
    },
});

export default CommentExtension;
