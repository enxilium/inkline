import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";

export interface SaveChapterContentRequest {
    projectId: string;
    chapterId: string;
    content: string;
}

export class SaveChapterContent {
    constructor(private readonly chapterRepository: IChapterRepository) {}

    async execute(request: SaveChapterContentRequest): Promise<void> {
        const { projectId, chapterId, content } = request;

        if (!projectId.trim() || !chapterId.trim()) {
            throw new Error("Project ID and Chapter ID are required.");
        }

        await this.chapterRepository.updateContent(
            projectId,
            chapterId,
            content
        );
    }
}
