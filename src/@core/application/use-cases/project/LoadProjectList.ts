import { Project } from "../../../domain/entities/story/Project";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { Image } from "../../../domain/entities/story/world/Image";

export interface LoadProjectListRequest {
    userId: string;
}

export interface LoadProjectListResponse {
    projects: Project[];
    covers: Record<string, Image>;
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

        const covers: Record<string, Image> = {};
        if (coverIds.length > 0) {
            const images = await this.assetRepository.findImagesByIds(coverIds);
            for (const image of images) {
                covers[image.id] = image;
            }
        }

        return { projects, covers };
    }
}
