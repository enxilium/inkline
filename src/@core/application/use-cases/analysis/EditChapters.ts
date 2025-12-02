import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IAITextService } from "../../../domain/services/IAITextService";
import { NarrativeContext } from "../../../domain/services/NarrativeContext";
import { buildNarrativeContext } from "../../utils/narrativeContext";

export interface EditChaptersRequest {
    projectId: string;
    chapterIds: string[];
}

export interface EditChaptersResponse {
    comments: {
        chapterId: string;
        comment: string;
        wordNumberStart: number;
        wordNumberEnd: number;
    }[];
}

export class EditChapters {
    constructor(
        private readonly aiTextService: IAITextService,
        private readonly chapterRepository: IChapterRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(request: EditChaptersRequest): Promise<EditChaptersResponse> {
        const { projectId, chapterIds } = request;
        const normalizedProjectId = projectId.trim();

        if (!normalizedProjectId) {
            throw new Error("Project ID is required.");
        }

        if (!chapterIds || chapterIds.length === 0) {
            throw new Error("No chapters selected for editing.");
        }

        await this.ensureProjectExists(normalizedProjectId);

        const context = await this.buildContext(normalizedProjectId);
        const comments = await this.aiTextService.editManuscript(
            chapterIds,
            context
        );

        return { comments };
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
