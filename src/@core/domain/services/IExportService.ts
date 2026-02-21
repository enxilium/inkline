export interface IExportService {
    exportProject(
        projectId: string,
        format: "epub",
        path: string,
        author?: string,
    ): Promise<void>;
}
