import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";

export interface RenameChapterRequest {
    chapterId: string;
    projectId: string;
    title: string;
}

export class RenameChapter {
    constructor(private readonly chapterRepository: IChapterRepository) {}

    async execute(request: RenameChapterRequest): Promise<void> {
        const { chapterId, projectId, title } = request;

        if (!chapterId.trim() || !projectId.trim()) {
            throw new Error("Project ID and Chapter ID are required.");
        }

        if (!title.trim()) {
            throw new Error("Chapter title cannot be empty.");
        }

        const chapter = await this.chapterRepository.findById(
            projectId,
            chapterId
        );
        if (!chapter) {
            throw new Error("Chapter not found for this project.");
        }

        chapter.title = title;
        chapter.updatedAt = new Date();
        await this.chapterRepository.update(projectId, chapter);
    }
}
