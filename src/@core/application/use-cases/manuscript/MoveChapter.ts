import { Chapter } from "../../../domain/entities/story/Chapter";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface MoveChapterRequest {
    projectId: string;
    chapterId: string;
    targetIndex: number;
}

export interface MoveChapterResponse {
    chapters: Chapter[];
}

export class MoveChapter {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository
    ) {}

    async execute(request: MoveChapterRequest): Promise<MoveChapterResponse> {
        const { projectId, chapterId, targetIndex } = request;

        if (!projectId.trim() || !chapterId.trim()) {
            throw new Error("Project ID and Chapter ID are required.");
        }

        if (targetIndex < 0) {
            throw new Error("Target index must be zero or greater.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const chapters = (
            await this.chapterRepository.findByProjectId(projectId)
        ).sort((a, b) => a.order - b.order);

        const currentIndex = chapters.findIndex(
            (chapter) => chapter.id === chapterId
        );
        if (currentIndex === -1) {
            throw new Error("Chapter not found for this project.");
        }

        if (targetIndex >= chapters.length) {
            throw new Error("Target index exceeds the number of chapters.");
        }

        const [chapter] = chapters.splice(currentIndex, 1);
        chapters.splice(targetIndex, 0, chapter);

        const now = new Date();
        await Promise.all(
            chapters.map((updatedChapter, index) => {
                updatedChapter.order = index;
                updatedChapter.updatedAt = now;
                return this.chapterRepository.update(projectId, updatedChapter);
            })
        );

        project.chapterIds = chapters.map((c) => c.id);
        project.updatedAt = now;
        await this.projectRepository.update(project);

        return { chapters };
    }
}
