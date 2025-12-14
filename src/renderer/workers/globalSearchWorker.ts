import type {
    GlobalFindResponse,
    GlobalFindSnippet,
    SearchDocumentSnapshot,
} from "../state/globalSearchTypes";

type SearchRequestMessage = {
    type: "search";
    requestId: number;
    docs: SearchDocumentSnapshot[];
    term: string;
    caseSensitive: boolean;
};

type SearchResponseMessage = {
    type: "searchResult";
    requestId: number;
    response: GlobalFindResponse;
};

type SearchErrorMessage = {
    type: "searchError";
    requestId: number;
    error: string;
};

type IncomingMessage = SearchRequestMessage;

type OutgoingMessage = SearchResponseMessage | SearchErrorMessage;

const countOccurrences = (
    source: string,
    term: string,
    caseSensitive: boolean
): number => {
    if (!term) {
        return 0;
    }

    const haystack = caseSensitive ? source : source.toLowerCase();
    const needle = caseSensitive ? term : term.toLowerCase();

    let index = haystack.indexOf(needle);
    let count = 0;
    while (index !== -1) {
        count += 1;
        index = haystack.indexOf(needle, index + needle.length);
    }

    return count;
};

const findFirstIndex = (
    source: string,
    term: string,
    caseSensitive: boolean
): number => {
    if (!term) {
        return -1;
    }

    const haystack = caseSensitive ? source : source.toLowerCase();
    const needle = caseSensitive ? term : term.toLowerCase();
    return haystack.indexOf(needle);
};

type TiptapNode = {
    type?: string;
    text?: string;
    content?: TiptapNode[];
};

const extractTextFromTiptapJson = (node: unknown, buffer: string[]): void => {
    if (!node) {
        return;
    }

    if (typeof node !== "object") {
        return;
    }

    const tiptapNode = node as TiptapNode;

    if (tiptapNode.type === "text" && typeof tiptapNode.text === "string") {
        buffer.push(tiptapNode.text);
        return;
    }

    const content = tiptapNode.content;
    if (Array.isArray(content)) {
        for (const child of content) {
            extractTextFromTiptapJson(child, buffer);
        }
        // Add a separator between block-ish nodes to reduce accidental word joins.
        if (tiptapNode.type && tiptapNode.type !== "text") {
            buffer.push("\n");
        }
    }
};

const getSearchText = (content: string): string => {
    if (!content) {
        return "";
    }

    try {
        const json = JSON.parse(content) as TiptapNode;
        const parts: string[] = [];
        extractTextFromTiptapJson(json, parts);
        return parts.join("");
    } catch {
        // Fallback for legacy plain text/HTML.
        return content;
    }
};

const getSearchTextForDoc = (doc: SearchDocumentSnapshot): string => {
    if (!doc.content) {
        return "";
    }

    if (doc.contentFormat === "plain") {
        return doc.content;
    }

    return getSearchText(doc.content);
};

const normalizeSnippetPart = (value: string): string => {
    return value.replace(/\s+/g, " ");
};

const buildSnippet = (
    source: string,
    matchIndex: number,
    matchLength: number
): GlobalFindSnippet => {
    const context = 32;

    const start = Math.max(0, matchIndex - context);
    const end = Math.min(source.length, matchIndex + matchLength + context);

    const leadingEllipsis = start > 0;
    const trailingEllipsis = end < source.length;

    const before = normalizeSnippetPart(source.slice(start, matchIndex));
    const match = source.slice(matchIndex, matchIndex + matchLength);
    const after = normalizeSnippetPart(
        source.slice(matchIndex + matchLength, end)
    );

    return {
        leadingEllipsis,
        before,
        match,
        after,
        trailingEllipsis,
    };
};

const computeGlobalFind = (
    docs: SearchDocumentSnapshot[],
    term: string,
    caseSensitive: boolean
): GlobalFindResponse => {
    const trimmed = term.trim();
    if (!trimmed) {
        return { totalOccurrences: 0, results: [] };
    }

    const results: GlobalFindResponse["results"] = [];
    let totalOccurrences = 0;

    for (const doc of docs) {
        const searchText = getSearchTextForDoc(doc);
        const occurrences = countOccurrences(
            searchText,
            trimmed,
            caseSensitive
        );
        if (occurrences > 0) {
            const matchIndex = findFirstIndex(
                searchText,
                trimmed,
                caseSensitive
            );

            totalOccurrences += occurrences;
            results.push({
                kind: doc.kind,
                documentId: doc.id,
                title: doc.title,
                binderIndex: doc.binderIndex,
                occurrences,
                snippet:
                    matchIndex >= 0
                        ? buildSnippet(searchText, matchIndex, trimmed.length)
                        : {
                              leadingEllipsis: false,
                              before: "",
                              match: "",
                              after: "",
                              trailingEllipsis: false,
                          },
            });
        }
    }

    return { totalOccurrences, results };
};

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
    const message = event.data;

    if (message.type !== "search") {
        return;
    }

    try {
        const response = computeGlobalFind(
            message.docs,
            message.term,
            message.caseSensitive
        );

        const outgoing: OutgoingMessage = {
            type: "searchResult",
            requestId: message.requestId,
            response,
        };
        self.postMessage(outgoing);
    } catch (error) {
        const outgoing: OutgoingMessage = {
            type: "searchError",
            requestId: message.requestId,
            error: (error as Error)?.message ?? "Search failed.",
        };
        self.postMessage(outgoing);
    }
};
