import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";

export interface OverwriteChapterRequest {
    id: string;
    title: string;
    content: string;
    order: number;
    projectId: string;
}

export class OverwriteChapter {
    constructor(private readonly chapterRepository: IChapterRepository) {}

    async execute(request: OverwriteChapterRequest): Promise<void> {
        const { id, title, content, order, projectId } = request;

        const chapter = await this.chapterRepository.findById(id);
        if (!chapter) {
            throw new Error(`Chapter ${id} not found.`);
        }

        // We overwrite everything with the provided data
        chapter.title = title;
        chapter.content = content;
        chapter.order = order;
        chapter.updatedAt = new Date(); // Bump timestamp so it becomes the new truth

        await this.chapterRepository.update(chapter);
    }
}
