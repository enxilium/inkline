import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Project } from "../../../domain/entities/story/Project";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateProjectRequest {
    userId: string;
    title: string;
}

export interface CreateProjectResponse {
    project: Project;
}

export class CreateProject {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository
    ) {}

    async execute(
        request: CreateProjectRequest
    ): Promise<CreateProjectResponse> {
        const title = request.title.trim();
        const user = await this.userRepository.findById(request.userId);

        if (!title) {
            throw new Error("Project title is required.");
        }

        if (!user) {
            throw new Error("User not found.");
        }

        const now = new Date();
        const project = new Project(
            generateId(),
            title,
            [],
            [],
            [],
            [],
            [],
            now,
            now
        );
        await this.projectRepository.create(request.userId, project);

        if (!user.projectIds.includes(project.id)) {
            user.projectIds.push(project.id);
            user.updatedAt = now;
            await this.userRepository.update(user);
        }

        return { project };
    }
}
