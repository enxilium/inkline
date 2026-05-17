import { IExportService } from "../../../domain/services/IExportService";

export interface ExportDocumentRequest {
    projectId: string;
    documentId: string;
    documentType: "chapter" | "scrapNote";
    format: "epub";
    destinationPath: string;
    author?: string;
}

export class ExportDocument {
    constructor(private readonly exportService: IExportService) {}

    async execute(request: ExportDocumentRequest): Promise<void> {
        await this.exportService.exportDocument(
            request.projectId,
            request.documentId,
            request.documentType,
            request.format,
            request.destinationPath,
            request.author,
        );
    }
}
