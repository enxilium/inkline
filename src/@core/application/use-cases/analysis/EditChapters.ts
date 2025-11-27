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
    startChapter: number;
    endChapter: number;
}

export interface EditChaptersResponse {
    comments: { chapterNumber: number; wordNumber: number; comment: string }[];
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
        const { projectId, startChapter, endChapter } = request;
        const normalizedProjectId = projectId.trim();

        if (!normalizedProjectId) {
            throw new Error("Project ID is required.");
        }

        if (startChapter < 0 || endChapter < 0 || startChapter > endChapter) {
            throw new Error("Invalid chapter range supplied for editing.");
        }

        await this.ensureProjectExists(normalizedProjectId);

        const context = await this.buildContext(normalizedProjectId);
        const comments = await this.aiTextService.editManuscript(
            {
                start: startChapter,
                end: endChapter,
            },
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
