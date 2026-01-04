import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";

export interface DeleteTimelineRequest {
    timelineId: string;
    projectId: string;
}

export class DeleteTimeline {
    constructor(
        private readonly timelineRepository: ITimelineRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(request: DeleteTimelineRequest): Promise<void> {
        const { timelineId, projectId } = request;

        if (!timelineId.trim()) {
            throw new Error("Timeline ID is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const timeline = await this.timelineRepository.findById(timelineId);
        if (!timeline) {
            throw new Error("Timeline not found.");
        }

        // Prevent deletion of the Main timeline
        if (timeline.name === "Main") {
            throw new Error("Cannot delete the Main timeline.");
        }

        await this.timelineRepository.delete(timelineId);

        project.timelineIds = project.timelineIds.filter(
            (id) => id !== timelineId
        );
        project.updatedAt = new Date();
        await this.projectRepository.update(project);
    }
}
