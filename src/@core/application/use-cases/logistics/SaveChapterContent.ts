import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";

export interface SaveChapterContentRequest {
    chapterId: string;
    content: string;
}

export class SaveChapterContent {
    constructor(private readonly chapterRepository: IChapterRepository) {}

    async execute(request: SaveChapterContentRequest): Promise<void> {
        const { chapterId, content } = request;

        if (!chapterId.trim()) {
            throw new Error("Chapter ID is required.");
        }

        await this.chapterRepository.updateContent(chapterId, content);
    }
}
