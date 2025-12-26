import { Chapter } from "../entities/story/Chapter";

export interface IChapterRepository {
    create(projectId: string, chapter: Chapter): Promise<void>;
    findById(id: string): Promise<Chapter | null>;
    findByProjectId(projectId: string): Promise<Chapter[]>;
    update(chapter: Chapter): Promise<void>;
    updateContent(
        chapterId: string,
        content: string,
        updatedAt?: Date
    ): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
}
