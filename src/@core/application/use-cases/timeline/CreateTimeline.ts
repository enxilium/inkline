import { Timeline } from "../../../domain/entities/story/timeline/Timeline";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";
import { generateId } from "../../utils/id";

// CE and BCE are the canonical units; custom allows any string
export type TimeUnitType = "CE" | "BCE" | string;

// Helper to check if a unit is a calendar-based unit (CE/BCE)
export const isCalendarUnit = (unit: string): boolean => {
    return unit === "CE" || unit === "BCE";
};

export interface CreateTimelineRequest {
    projectId: string;
    name: string;
    description: string;
    timeUnit: TimeUnitType;
    startValue?: number;
}

export interface CreateTimelineResponse {
    timeline: Timeline;
}

export class CreateTimeline {
    constructor(
        private readonly timelineRepository: ITimelineRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(
        request: CreateTimelineRequest
    ): Promise<CreateTimelineResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        // Validate startValue: must be >= 0 for CE/BCE
        let startValue = request.startValue ?? 0;
        if (isCalendarUnit(request.timeUnit) && startValue < 0) {
            startValue = 0;
        }

        const now = new Date();
        const id = generateId();
        const timeline = new Timeline(
            id,
            projectId,
            request.name,
            request.description,
            request.timeUnit,
            startValue,
            [],
            now,
            now
        );

        await this.timelineRepository.create(projectId, timeline);

        project.timelineIds.push(id);
        project.updatedAt = now;
        await this.projectRepository.update(project);

        return { timeline };
    }
}
