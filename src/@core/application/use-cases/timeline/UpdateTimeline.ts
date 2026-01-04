import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";
import { isCalendarUnit } from "./CreateTimeline";

export interface UpdateTimelineRequest {
    timelineId: string;
    name?: string;
    description?: string;
    timeUnit?: string;
    startValue?: number;
}

export class UpdateTimeline {
    constructor(private readonly timelineRepository: ITimelineRepository) {}

    async execute(request: UpdateTimelineRequest): Promise<void> {
        const { timelineId, name, description, timeUnit, startValue } = request;

        if (!timelineId.trim()) {
            throw new Error("Timeline ID is required.");
        }

        const timeline = await this.timelineRepository.findById(timelineId);
        if (!timeline) {
            throw new Error("Timeline not found.");
        }

        let hasChanges = false;

        if (name !== undefined && timeline.name !== name) {
            if (!name.trim()) {
                throw new Error("Timeline name cannot be empty.");
            }
            timeline.name = name;
            hasChanges = true;
        }

        if (description !== undefined && timeline.description !== description) {
            timeline.description = description;
            hasChanges = true;
        }

        if (timeUnit !== undefined && timeline.timeUnit !== timeUnit) {
            timeline.timeUnit = timeUnit;
            hasChanges = true;
        }

        if (startValue !== undefined && timeline.startValue !== startValue) {
            // Validate startValue: must be >= 0 for CE/BCE
            const effectiveUnit = timeUnit ?? timeline.timeUnit;
            if (isCalendarUnit(effectiveUnit) && startValue < 0) {
                timeline.startValue = 0;
            } else {
                timeline.startValue = startValue;
            }
            hasChanges = true;
        }

        if (hasChanges) {
            timeline.updatedAt = new Date();
            await this.timelineRepository.update(timeline);
        }
    }
}
