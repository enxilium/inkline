export type TextStats = {
    plainText: string;
    wordCount: number;
    characterCount: number;
};

const extractTextFromTiptapNode = (node: unknown, out: string[]): void => {
    if (!node || typeof node !== "object") {
        return;
    }

    const rec = node as {
        type?: unknown;
        text?: unknown;
        content?: unknown;
    };

    if (typeof rec.text === "string") {
        out.push(rec.text);
    }

    const content = rec.content;
    if (Array.isArray(content)) {
        for (const child of content) {
            extractTextFromTiptapNode(child, out);
        }
    }
};

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
        return pieces.join("");
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

export const getTextStats = (content: string | null | undefined): TextStats => {
    const plainText = extractPlainText(content);
    return {
        plainText,
        wordCount: countWords(plainText),
        characterCount: plainText.length,
    };
};
