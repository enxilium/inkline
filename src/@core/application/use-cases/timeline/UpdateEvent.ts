import { Event } from "../../../domain/entities/story/timeline/Event";
import { IEventRepository } from "../../../domain/repositories/IEventRepository";

export interface UpdateEventRequest {
    eventId: string;
    title?: string;
    description?: string;
    year?: number;
    month?: number | null;
    day?: number | null;
    characterIds?: string[];
    locationIds?: string[];
    organizationIds?: string[];
}

export interface UpdateEventResponse {
    event: Event;
}

export class UpdateEvent {
    constructor(private readonly eventRepository: IEventRepository) {}

    async execute(request: UpdateEventRequest): Promise<UpdateEventResponse> {
        const {
            eventId,
            title,
            description,
            year,
            month,
            day,
            characterIds,
            locationIds,
            organizationIds,
        } = request;

        if (!eventId.trim()) {
            throw new Error("Event ID is required.");
        }

        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error("Event not found.");
        }

        let hasChanges = false;

        if (title !== undefined && event.title !== title) {
            if (!title.trim()) {
                throw new Error("Event title cannot be empty.");
            }
            event.title = title;
            hasChanges = true;
        }

        if (description !== undefined && event.description !== description) {
            event.description = description;
            hasChanges = true;
        }

        if (year !== undefined && event.year !== year) {
            event.year = year;
            event.time = year; // Keep time in sync for backward compatibility
            hasChanges = true;
        }

        if (month !== undefined && event.month !== month) {
            event.month = month;
            hasChanges = true;
        }

        if (day !== undefined && event.day !== day) {
            event.day = day;
            hasChanges = true;
        }

        if (characterIds !== undefined) {
            event.characterIds = characterIds;
            hasChanges = true;
        }

        if (locationIds !== undefined) {
            event.locationIds = locationIds;
            hasChanges = true;
        }

        if (organizationIds !== undefined) {
            event.organizationIds = organizationIds;
            hasChanges = true;
        }

        if (hasChanges) {
            event.updatedAt = new Date();
            await this.eventRepository.update(event);
        }

        return { event };
    }
}
