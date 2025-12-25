import type { Node as PMNode, MarkType } from "@tiptap/pm/model";

export type WordWithPositions = {
    text: string;
    from: number;
    to: number;
};

// Word tokens for Edit Chapters must exclude punctuation so replacements don't
// consume punctuation (e.g. commas/periods). Keep common intra-word joiners.
const EDIT_WORD_REGEX = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

export const extractWordsWithPositions = (doc: PMNode): WordWithPositions[] => {
    const words: WordWithPositions[] = [];

    doc.descendants((node, pos) => {
        if (!node.isText || typeof node.text !== "string") {
            return;
        }

        for (const match of node.text.matchAll(EDIT_WORD_REGEX)) {
            const index = match.index;
            if (index === undefined) {
                continue;
            }
            const text = match[0];
            const from = pos + index;
            const to = from + text.length;
            words.push({ text, from, to });
        }
    });

    return words;
};

export const sanitizeReplacementText = (value: string): string => {
    return value
        .replace(/[^\p{L}\p{N}\s’'-]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
};

export const normalizeEditText = (value: string): string => {
    // Normalize whitespace, ignore casing, ignore punctuation.
    return value
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]+/gu, "")
        .replace(/\s+/g, " ")
        .trim();
};

export const stripCommentMarksFromTiptapJSON = (json: unknown): unknown => {
    if (!json || typeof json !== "object") {
        return json;
    }

    if (Array.isArray(json)) {
        return json.map(stripCommentMarksFromTiptapJSON);
    }

    const record = json as Record<string, unknown>;
    const next: Record<string, unknown> = { ...record };

    if (Array.isArray(record.marks)) {
        next.marks = (record.marks as unknown[]).filter((mark) => {
            const markObj = mark as { type?: unknown };
            return markObj?.type !== "comment";
        });
    }

    if (Array.isArray(record.content)) {
        next.content = (record.content as unknown[]).map(
            stripCommentMarksFromTiptapJSON
        );
    }

    return next;
};

export const hasCommentId = (
    doc: PMNode,
    commentMarkType: MarkType,
    commentId: string
): boolean => {
    let found = false;

    doc.descendants((node) => {
        if (!node.isText || !node.marks?.length) {
            return;
        }

        for (const mark of node.marks) {
            if (
                mark.type === commentMarkType &&
                (mark.attrs as { commentId?: string })?.commentId === commentId
            ) {
                found = true;
                return false;
            }
        }
    });

    return found;
};
