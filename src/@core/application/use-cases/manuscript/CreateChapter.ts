import { Chapter } from "../../../domain/entities/story/Chapter";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateChapterRequest {
    projectId: string;
    order: number;
}

export interface CreateChapterResponse {
    chapter: Chapter;
}

export class CreateChapter {
    constructor(
        private readonly chapterRepository: IChapterRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(
        request: CreateChapterRequest
    ): Promise<CreateChapterResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        if (!Number.isFinite(request.order)) {
            throw new Error("Chapter order is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const chapters = (
            await this.chapterRepository.findByProjectId(projectId)
        ).sort((a, b) => a.order - b.order);
        const requestedOrder = Math.floor(request.order);
        const normalizedOrder = Math.max(0, requestedOrder);
        const insertIndex = Math.min(normalizedOrder, chapters.length);

        const now = new Date();
        const title = "New Chapter";
        const id = generateId();
        const chapter = new Chapter(id, title, insertIndex, "", now, now);

        await this.chapterRepository.create(projectId, chapter);

        chapters.splice(insertIndex, 0, chapter);

        const reindexPromises = chapters
            .map((existingChapter, index) => ({ existingChapter, index }))
            .filter(
                ({ existingChapter, index }) =>
                    existingChapter.id !== chapter.id &&
                    existingChapter.order !== index
            )
            .map(({ existingChapter, index }) => {
                existingChapter.order = index;
                existingChapter.updatedAt = now;
                return this.chapterRepository.update(existingChapter);
            });

        await Promise.all(reindexPromises);

        project.chapterIds = chapters.map((c) => c.id);
        project.updatedAt = now;
        await this.projectRepository.update(project);

        return { chapter };
    }
}
