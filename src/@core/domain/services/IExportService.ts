export interface IExportService {
    exportProject(
        projectId: string,
        format: "pdf" | "epub" | "docx",
        path: string
    ): Promise<void>;
}
