import type {
    GlobalFindResponse,
    GlobalFindSnippet,
    SearchDocumentSnapshot,
} from "./globalSearchTypes";

type WorkerSearchMessage = {
    type: "search";
    requestId: number;
    docs: SearchDocumentSnapshot[];
    term: string;
    caseSensitive: boolean;
};

type WorkerSearchResultMessage = {
    type: "searchResult";
    requestId: number;
    response: GlobalFindResponse;
};

type WorkerSearchErrorMessage = {
    type: "searchError";
    requestId: number;
    error: string;
};

type WorkerMessage = WorkerSearchResultMessage | WorkerSearchErrorMessage;

type PendingRequest = {
    resolve: (value: GlobalFindResponse) => void;
    reject: (error: Error) => void;
};

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

export class GlobalSearchEngine {
    private worker: Worker | null = null;
    private nextRequestId = 1;
    private pending = new Map<number, PendingRequest>();
    private workerDisabled = false;

    private ensureWorker(): Worker | null {
        if (this.workerDisabled) {
            return null;
        }

        if (this.worker) {
            return this.worker;
        }

        try {
            this.worker = new Worker(
                new URL("../workers/globalSearchWorker.ts", import.meta.url),
                { type: "module" }
            );
            this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
                const message = event.data;
                const pending = this.pending.get(message.requestId);
                if (!pending) {
                    return;
                }
                this.pending.delete(message.requestId);

                if (message.type === "searchResult") {
                    pending.resolve(message.response);
                    return;
                }

                pending.reject(new Error(message.error));
            };
            this.worker.onerror = () => {
                this.workerDisabled = true;
                this.worker?.terminate();
                this.worker = null;
                for (const [, pending] of this.pending) {
                    pending.reject(new Error("Search worker crashed."));
                }
                this.pending.clear();
            };
            return this.worker;
        } catch {
            this.workerDisabled = true;
            this.worker = null;
            return null;
        }
    }

    async globalFind(params: {
        docs: SearchDocumentSnapshot[];
        term: string;
        caseSensitive: boolean;
    }): Promise<GlobalFindResponse> {
        const worker = this.ensureWorker();
        if (!worker) {
            return computeGlobalFind(
                params.docs,
                params.term,
                params.caseSensitive
            );
        }

        const requestId = this.nextRequestId++;
        const message: WorkerSearchMessage = {
            type: "search",
            requestId,
            docs: params.docs,
            term: params.term,
            caseSensitive: params.caseSensitive,
        };

        return new Promise<GlobalFindResponse>((resolve, reject) => {
            this.pending.set(requestId, {
                resolve,
                reject: (error) => reject(error),
            });

            try {
                worker.postMessage(message);
            } catch (error) {
                this.pending.delete(requestId);
                reject(
                    error instanceof Error ? error : new Error("Search failed.")
                );
            }
        });
    }
}

export const globalSearchEngine = new GlobalSearchEngine();
