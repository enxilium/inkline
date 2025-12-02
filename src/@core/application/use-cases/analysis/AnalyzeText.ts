import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IAITextService } from "../../../domain/services/IAITextService";
import { NarrativeContext } from "../../../domain/services/NarrativeContext";
import { buildNarrativeContext } from "../../utils/narrativeContext";

export interface AnalyzeTextRequest {
    projectId: string;
    content: string;
    instruction: string;
}

export interface AnalyzeTextResponse {
    stream: AsyncGenerator<string, void, unknown>;
}

export class AnalyzeText {
    constructor(
        private readonly aiTextService: IAITextService,
        private readonly chapterRepository: IChapterRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(request: AnalyzeTextRequest): Promise<AnalyzeTextResponse> {
        const { projectId, content, instruction } = request;
        const normalizedProjectId = projectId.trim();

        if (!normalizedProjectId) {
            throw new Error("Project ID is required.");
        }

        await this.ensureProjectExists(normalizedProjectId);

        if (!content.trim()) {
            throw new Error("Content to analyze is required.");
        }

        if (!instruction.trim()) {
            throw new Error("An analysis instruction is required.");
        }

        const context = await this.buildContext(normalizedProjectId);

        const stream = this.aiTextService.analyze(
            content,
            instruction,
            context
        );

        return { stream };
    }

    private async buildContext(projectId: string): Promise<NarrativeContext> {
        const [
            chapters,
            characterProfiles,
            locationProfiles,
            organizationProfiles,
        ] = await Promise.all([
            this.chapterRepository.findByProjectId(projectId),
            this.characterRepository.getCharacterProfiles(projectId),
            this.locationRepository.getLocationProfiles(projectId),
            this.organizationRepository.getOrganizationProfiles(projectId),
        ]);
        return buildNarrativeContext(
            chapters,
            characterProfiles,
            locationProfiles,
            organizationProfiles
        );
    }

    private async ensureProjectExists(projectId: string): Promise<void> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }
    }
}
