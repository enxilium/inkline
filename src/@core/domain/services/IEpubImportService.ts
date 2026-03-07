export interface ParsedImage {
    /** Placeholder ID used in Tiptap JSON src attributes before upload. */
    id: string;
    data: ArrayBuffer;
    mimeType: string;
}

export interface ParsedChapter {
    title: string;
    /** Tiptap-compatible ProseMirror JSON document node. */
    content: object;
    images: ParsedImage[];
}

export interface ParsedEpub {
    title: string;
    coverImage: { data: ArrayBuffer; mimeType: string } | null;
    chapters: ParsedChapter[];
}

export interface IEpubImportService {
    parseEpub(
        fileBuffer: ArrayBuffer,
        onProgress?: (percent: number) => void,
    ): Promise<ParsedEpub>;
}
