import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface DeleteChapterRequest {
    projectId: string;
    chapterId: string;
}

export class DeleteChapter {
    constructor(
        private readonly chapterRepository: IChapterRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(request: DeleteChapterRequest): Promise<void> {
        const { projectId, chapterId } = request;

        if (!projectId.trim() || !chapterId.trim()) {
            throw new Error("Project ID and Chapter ID are required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const chapter = await this.chapterRepository.findById(
            projectId,
            chapterId
        );
        if (!chapter || !project.chapterIds.includes(chapterId)) {
            throw new Error("Chapter not found for this project.");
        }

        // 1. Detach from Project (Parent)
        project.chapterIds = project.chapterIds.filter(
            (id) => id !== chapterId
        );
        project.updatedAt = new Date();
        await this.projectRepository.update(project);

        // 2. Reorder Siblings
        // We fetch all chapters, filter out the one we are deleting (in case it's still there),
        // and then update the order of the ones that came after it.
        const allChapters =
            await this.chapterRepository.findByProjectId(projectId);
        const affected = allChapters.filter(
            (c) => c.id !== chapterId && c.order > chapter.order
        );

        if (affected.length) {
            const now = new Date();
            await Promise.all(
                affected.map((remaining) => {
                    remaining.order -= 1;
                    remaining.updatedAt = now;
                    return this.chapterRepository.update(projectId, remaining);
                })
            );
        }

        // 3. Delete Chapter (Self)
        await this.chapterRepository.delete(projectId, chapterId);
    }
}
