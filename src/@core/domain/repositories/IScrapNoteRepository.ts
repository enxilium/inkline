import { ScrapNote } from "../entities/story/ScrapNote";

export interface IScrapNoteRepository {
    create(projectId: string, scrapNote: ScrapNote): Promise<void>;
    findById(projectId: string, id: string): Promise<ScrapNote | null>;
    findByProjectId(projectId: string): Promise<ScrapNote[]>;
    update(projectId: string, scrapNote: ScrapNote): Promise<void>;
    updateContent(
        projectId: string,
        scrapNoteId: string,
        content: string
    ): Promise<void>;
    delete(projectId: string, id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
}
