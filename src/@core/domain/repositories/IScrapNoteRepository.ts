import { ScrapNote } from "../entities/story/ScrapNote";

export interface IScrapNoteRepository {
    create(projectId: string, scrapNote: ScrapNote): Promise<void>;
    findById(id: string): Promise<ScrapNote | null>;
    findByProjectId(projectId: string): Promise<ScrapNote[]>;
    update(scrapNote: ScrapNote): Promise<void>;
    updateContent(
        scrapNoteId: string,
        content: string,
        updatedAt?: Date
    ): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
}
