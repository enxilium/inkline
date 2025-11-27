import { Chapter } from "../../../domain/entities/story/Chapter";
import { Project } from "../../../domain/entities/story/Project";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IExportService } from "../../../domain/services/IExportService";

export interface ExportManuscriptRequest {
    projectId: string;
    format: "pdf" | "epub" | "docx";
    destinationPath: string;
}

export class ExportManuscript {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly exportService: IExportService
    ) {}

    async execute(request: ExportManuscriptRequest): Promise<void> {
        const project = await this.loadProject(request.projectId);
        const chapters = await this.loadChapters(project.id);
        await this.exportService.exportProject(
            project,
            chapters,
            request.format,
            request.destinationPath
        );
    }

    private async loadProject(projectId: string): Promise<Project> {
        const normalizedId = projectId.trim();
        if (!normalizedId) {
            throw new Error("Project ID is required to export a manuscript.");
        }

        const project = await this.projectRepository.findById(normalizedId);
        if (!project) {
            throw new Error("Project not found.");
        }

        return project;
    }

    private async loadChapters(projectId: string): Promise<Chapter[]> {
        const chapters =
            await this.chapterRepository.findByProjectId(projectId);
        return [...chapters].sort((a, b) => a.order - b.order);
    }
}
