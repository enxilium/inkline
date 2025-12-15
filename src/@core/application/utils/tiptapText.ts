export type TextStats = {
    plainText: string;
    wordCount: number;
    characterCount: number;
};

type TiptapJsonNode = {
    type?: unknown;
    text?: unknown;
    content?: unknown;
};

const BLOCK_NODE_TYPES = new Set<string>([
    "paragraph",
    "heading",
    "blockquote",
    "listItem",
    "bulletList",
    "orderedList",
    "taskList",
    "taskItem",
    "codeBlock",
]);

const extractTextFromTiptapNode = (node: unknown, out: string[]): void => {
    if (!node || typeof node !== "object") {
        return;
    }

    const rec = node as TiptapJsonNode;

    const nodeType = typeof rec.type === "string" ? rec.type : null;
    if (nodeType === "hardBreak") {
        // Mirror editor behavior: hard breaks separate words.
        out.push("\n");
        return;
    }

    if (typeof rec.text === "string") {
        out.push(rec.text);
    }

    const content = rec.content;
    if (Array.isArray(content)) {
        for (const child of content) {
            extractTextFromTiptapNode(child, out);
        }

        // Mirror editor behavior: block boundaries separate words.
        if (nodeType && nodeType !== "doc" && BLOCK_NODE_TYPES.has(nodeType)) {
            out.push("\n");
        }
    }
};

/**
 * Extract plain text from Inkline's stored TipTap content.
 * This intentionally mirrors the renderer behavior so AI word indices align.
 */
export const extractPlainText = (
    content: string | null | undefined
): string => {
    if (!content) {
        return "";
    }

    // Prefer TipTap JSON that we store as stringified JSON.
    try {
        const json = JSON.parse(content) as unknown;
        const pieces: string[] = [];
        extractTextFromTiptapNode(json, pieces);
        return pieces.join("").replace(/\s+/g, " ").trim();
    } catch {
        // Fallback: treat as HTML-ish string.
        // This is intentionally simple; content is normally JSON.
        return content
            .replace(/<[^>]*>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }
};

export const countWords = (plainText: string): number => {
    const normalized = plainText.trim();
    if (!normalized) {
        return 0;
    }

    // Treat any whitespace run as a separator.
    return normalized.split(/\s+/).filter(Boolean).length;
};

/**
 * Split into words using the same rule as countWords(): whitespace runs.
 * This is used to align AI word indices with the editor.
 */
export const splitWords = (plainText: string): string[] => {
    const normalized = plainText.trim();
    if (!normalized) {
        return [];
    }

    return normalized.split(/\s+/).filter(Boolean);
};

// Words used for Edit Chapters indexing must exclude surrounding punctuation so
// replacements do not eat punctuation (e.g. commas/periods).
// We keep common intra-word joiners like apostrophes and hyphens.
const EDIT_WORD_REGEX = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

/**
 * Split into word tokens for Edit Chapters.
 * - Excludes punctuation.
 * - Keeps apostrophes/hyphens inside words.
 */
export const splitWordsForEditIndexing = (plainText: string): string[] => {
    const normalized = plainText.trim();
    if (!normalized) {
        return [];
    }

    const matches = normalized.match(EDIT_WORD_REGEX);
    return matches ?? [];
};

/**
 * Sanitizes replacement text so it won't introduce or remove punctuation.
 * Allows letters/numbers/whitespace and apostrophes/hyphens.
 */
export const sanitizeReplacementTextForEdits = (value: string): string => {
    return value
        .replace(/[^\p{L}\p{N}\s’'-]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
};

export const getTextStats = (content: string | null | undefined): TextStats => {
    const plainText = extractPlainText(content);
    return {
        plainText,
        wordCount: countWords(plainText),
        characterCount: plainText.length,
    };
};
