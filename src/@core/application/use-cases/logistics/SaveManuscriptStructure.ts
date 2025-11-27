import { Chapter } from "../../../domain/entities/story/Chapter";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface SaveManuscriptStructureRequest {
    projectId: string;
    orderedChapterIds: string[];
}

export class SaveManuscriptStructure {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository
    ) {}

    async execute(request: SaveManuscriptStructureRequest): Promise<void> {
        const { projectId, orderedChapterIds } = request;

        if (!projectId.trim()) {
            throw new Error("Project ID is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const chapters =
            await this.chapterRepository.findByProjectId(projectId);
        const chapterMap = new Map(
            chapters.map((chapter) => [chapter.id, chapter])
        );

        const normalizedOrder = this.validateChapterOrdering(
            orderedChapterIds,
            chapterMap,
            projectId
        );

        const now = new Date();
        await Promise.all(
            normalizedOrder.map(async (chapterId, index) => {
                const chapter = chapterMap.get(chapterId)!;
                chapter.order = index;
                chapter.updatedAt = now;
                await this.chapterRepository.update(projectId, chapter);
            })
        );

        project.chapterIds = [...normalizedOrder];
        project.updatedAt = now;
        await this.projectRepository.update(project);
    }

    private validateChapterOrdering(
        orderedChapterIds: string[],
        chapterMap: Map<string, Chapter>,
        projectId: string
    ): string[] {
        if (orderedChapterIds.length !== chapterMap.size) {
            throw new Error(
                "Ordered chapter list is out of sync with project chapters."
            );
        }

        const normalizedOrder: string[] = [];
        const seen = new Set<string>();

        orderedChapterIds.forEach((chapterId, index) => {
            const normalized = chapterId.trim();
            if (!normalized) {
                throw new Error(`Chapter ID at position ${index} is invalid.`);
            }

            if (seen.has(normalized)) {
                throw new Error(
                    "Duplicate chapter IDs supplied in ordering payload."
                );
            }

            const chapter = chapterMap.get(normalized);
            if (!chapter) {
                throw new Error(
                    "Chapter ordering references an unknown chapter."
                );
            }

            seen.add(normalized);
            normalizedOrder.push(normalized);
        });

        return normalizedOrder;
    }
}
