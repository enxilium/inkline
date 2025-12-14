export type SearchDocumentKind =
    | "chapter"
    | "scrapNote"
    | "character"
    | "location"
    | "organization";

export type SearchContentFormat = "tiptap-json" | "plain";

export type SearchDocumentSnapshot = {
    kind: SearchDocumentKind;
    id: string;
    title: string;
    content: string;
    contentFormat: SearchContentFormat;
    /**
     * 0-based ordering within its binder section. Used to present results
     * in the same relative order as the document binder.
     */
    binderIndex: number;
};

export type GlobalFindSnippet = {
    leadingEllipsis: boolean;
    before: string;
    match: string;
    after: string;
    trailingEllipsis: boolean;
};

export interface GlobalFindRequest {
    projectId: string;
    term: string;
    caseSensitive?: boolean;
}

export interface GlobalFindResult {
    kind: SearchDocumentKind;
    documentId: string;
    title: string;
    binderIndex: number;
    occurrences: number;
    snippet: GlobalFindSnippet;
}

export interface GlobalFindResponse {
    totalOccurrences: number;
    results: GlobalFindResult[];
}

export interface GlobalFindAndReplaceRequest {
    projectId: string;
    find: string;
    replace: string;
    caseSensitive?: boolean;
}

export interface GlobalFindAndReplaceResponse {
    replacements: number;
}
