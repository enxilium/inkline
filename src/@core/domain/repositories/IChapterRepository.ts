import { Chapter } from "../entities/story/Chapter";

export interface IChapterRepository {
    create(projectId: string, chapter: Chapter): Promise<void>;
    findById(projectId: string, id: string): Promise<Chapter | null>;
    findByProjectId(projectId: string): Promise<Chapter[]>;
    update(projectId: string, chapter: Chapter): Promise<void>;
    updateContent(
        projectId: string,
        chapterId: string,
        content: string
    ): Promise<void>;
    delete(projectId: string, id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
}
