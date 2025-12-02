import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";

export interface DeleteScrapNoteRequest {
    projectId: string;
    scrapNoteId: string;
}

export class DeleteScrapNote {
    constructor(
        private readonly scrapNoteRepository: IScrapNoteRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(request: DeleteScrapNoteRequest): Promise<void> {
        const { projectId, scrapNoteId } = request;

        if (!projectId.trim() || !scrapNoteId.trim()) {
            throw new Error("Project ID and scrap note ID are required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const scrapNote = await this.scrapNoteRepository.findById(scrapNoteId);
        if (!scrapNote) {
            throw new Error("Scrap note not found for this project.");
        }

        // 1. Detach from Project (Parent)
        if (project.scrapNoteIds.includes(scrapNoteId)) {
            project.scrapNoteIds = project.scrapNoteIds.filter(
                (id) => id !== scrapNoteId
            );
            project.updatedAt = new Date();
            await this.projectRepository.update(project);
        }

        // 2. Delete Scrap Note (Self)
        await this.scrapNoteRepository.delete(scrapNoteId);
    }
}
