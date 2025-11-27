import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface SaveProjectSettingsRequest {
    projectId: string;
    title?: string;
}

export class SaveProjectSettings {
    constructor(private readonly projectRepository: IProjectRepository) {}

    async execute(request: SaveProjectSettingsRequest): Promise<void> {
        const { projectId, title } = request;

        if (!projectId.trim()) {
            throw new Error("Project ID is required.");
        }

        if (title !== undefined && !title.trim()) {
            throw new Error("Project title cannot be empty.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        let changed = false;
        if (title !== undefined && project.title !== title) {
            project.title = title;
            changed = true;
        }

        if (changed) {
            project.updatedAt = new Date();
            await this.projectRepository.update(project);
        }
    }
}
