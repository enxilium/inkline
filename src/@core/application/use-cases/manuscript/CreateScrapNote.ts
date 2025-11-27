import { ScrapNote } from "../../../domain/entities/story/ScrapNote";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";
import { generateId } from "../../utils/id";

export interface CreateScrapNoteRequest {
    projectId: string;
}

export interface CreateScrapNoteResponse {
    scrapNote: ScrapNote;
}

export class CreateScrapNote {
    constructor(
        private readonly scrapNoteRepository: IScrapNoteRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(
        request: CreateScrapNoteRequest
    ): Promise<CreateScrapNoteResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const title = "New Scrap Note";
        const id = generateId();
        const scrapNote = new ScrapNote(id, title, "", false, now, now);

        await this.scrapNoteRepository.create(projectId, scrapNote);
        project.scrapNoteIds.push(id);
        project.updatedAt = now;
        await this.projectRepository.update(project);

        return { scrapNote };
    }
}
