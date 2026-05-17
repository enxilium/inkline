export interface IExportService {
    exportProject(
        projectId: string,
        format: "epub",
        path: string,
        author?: string,
    ): Promise<void>;
    exportDocument(
        projectId: string,
        documentId: string,
        documentType: "chapter" | "scrapNote",
        format: "epub",
        path: string,
        author?: string,
    ): Promise<void>;
}
