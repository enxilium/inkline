import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface RenameProjectRequest {
    projectId: string;
    title: string;
}

export class RenameProject {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(request: RenameProjectRequest): Promise<void> {
        const { projectId, title } = request;

        if (!projectId.trim()) {
            throw new Error("Project ID is required.");
        }

        if (!title.trim()) {
            throw new Error("Project title cannot be empty.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        if (project.title === title) {
            return;
        }

        project.title = title;
        project.updatedAt = new Date();
        await this.projectRepository.update(project);
    }
}
