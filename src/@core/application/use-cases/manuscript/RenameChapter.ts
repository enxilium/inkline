import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";

export interface RenameChapterRequest {
    chapterId: string;
    title: string;
}

export class RenameChapter {
    constructor(private readonly chapterRepository: IChapterRepository) {}

    async execute(request: RenameChapterRequest): Promise<void> {
        const { chapterId, title } = request;

        if (!chapterId.trim()) {
            throw new Error("Chapter ID is required.");
        }

        if (!title.trim()) {
            throw new Error("Chapter title cannot be empty.");
        }

        const chapter = await this.chapterRepository.findById(chapterId);
        if (!chapter) {
            throw new Error("Chapter not found for this project.");
        }

        if (chapter.title === title) {
            return;
        }

        chapter.title = title;
        chapter.updatedAt = new Date();
        await this.chapterRepository.update(chapter);
    }
}
