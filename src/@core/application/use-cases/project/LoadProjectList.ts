import { Project } from "../../../domain/entities/story/Project";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";

export interface LoadProjectListRequest {
    userId: string;
}

export type ProjectListItem = Project & { coverImageUrl: string | null };

export interface LoadProjectListResponse {
    projects: ProjectListItem[];
}

export class LoadProjectList {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly assetRepository: IAssetRepository
    ) {}

    async execute(
        request: LoadProjectListRequest
    ): Promise<LoadProjectListResponse> {
        const userId = request.userId.trim();
        if (!userId) {
            throw new Error("User ID is required to load projects.");
        }

        const projects = await this.projectRepository.findAllByUserId(userId);
        projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        const coverIds = projects
            .map((p) => p.coverImageId)
            .filter((id): id is string => !!id);

        const images =
            coverIds.length > 0
                ? await this.assetRepository.findImagesByIds(coverIds)
                : [];

        const imageMap = new Map(images.map((img) => [img.id, img.url]));

        const projectListItems: ProjectListItem[] = projects.map((project) => ({
            ...project,
            coverImageUrl: project.coverImageId
                ? imageMap.get(project.coverImageId) ?? null
                : null,
        }));

        return { projects: projectListItems };
    }
}
