export interface IExportService {
    exportProject(
        projectId: string,
        format: "epub",
        path: string,
    ): Promise<void>;
}
