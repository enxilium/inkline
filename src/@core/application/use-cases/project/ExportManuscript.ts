import { IExportService } from "../../../domain/services/IExportService";

export interface ExportManuscriptRequest {
    projectId: string;
    format: "pdf" | "epub" | "docx";
    destinationPath: string;
}

export class ExportManuscript {
    constructor(private readonly exportService: IExportService) {}

    async execute(request: ExportManuscriptRequest): Promise<void> {
        await this.exportService.exportProject(
            request.projectId,
            request.format,
            request.destinationPath
        );
    }
}
