import { Project } from "../../../domain/entities/story/Project";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface LoadProjectListRequest {
    userId: string;
}

export interface LoadProjectListResponse {
    projects: Project[];
}

export class LoadProjectList {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(
        request: LoadProjectListRequest
    ): Promise<LoadProjectListResponse> {
        const userId = request.userId.trim();
        if (!userId) {
            throw new Error("User ID is required to load projects.");
        }

        const projects = await this.projectRepository.findAllByUserId(userId);
        projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return { projects };
    }
}
