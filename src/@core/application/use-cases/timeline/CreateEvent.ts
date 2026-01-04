import {
    Event,
    EventType,
} from "../../../domain/entities/story/timeline/Event";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IEventRepository } from "../../../domain/repositories/IEventRepository";
import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";
import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";
import { generateId } from "../../utils/id";

export interface CreateEventRequest {
    timelineId: string;
    title: string;
    description: string;
    year: number;
    month?: number | null; // 1-12 for CE/BCE, null for custom
    day?: number | null; // 1-31 for CE/BCE, null for custom
    type: EventType;
    associatedId: string | null;
}

export interface CreateEventResponse {
    event: Event;
}

export class CreateEvent {
    constructor(
        private readonly eventRepository: IEventRepository,
        private readonly timelineRepository: ITimelineRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly scrapNoteRepository: IScrapNoteRepository
    ) {}

    async execute(request: CreateEventRequest): Promise<CreateEventResponse> {
        const {
            timelineId,
            title,
            description,
            year,
            month,
            day,
            type,
            associatedId,
        } = request;

        if (!timelineId.trim()) {
            throw new Error("Timeline ID is required.");
        }

        const timeline = await this.timelineRepository.findById(timelineId);
        if (!timeline) {
            throw new Error("Timeline not found.");
        }

        const now = new Date();
        const id = generateId();
        const event = new Event(
            id,
            timelineId,
            title,
            description,
            year, // time field for backward compatibility / positioning
            year,
            month ?? null,
            day ?? null,
            type,
            associatedId,
            [], // characterIds - empty initially
            [], // locationIds - empty initially
            [], // organizationIds - empty initially
            now,
            now
        );

        await this.eventRepository.create(timelineId, event);

        // Update associated entity if applicable
        if (type === "chapter" && associatedId) {
            const chapter = await this.chapterRepository.findById(associatedId);
            if (chapter) {
                chapter.eventId = id;
                chapter.updatedAt = now;
                await this.chapterRepository.update(chapter);
            }
        } else if (type === "scrap_note" && associatedId) {
            const scrapNote =
                await this.scrapNoteRepository.findById(associatedId);
            if (scrapNote) {
                scrapNote.eventId = id;
                scrapNote.updatedAt = now;
                await this.scrapNoteRepository.update(scrapNote);
            }
        }

        timeline.eventIds.push(id);
        timeline.updatedAt = now;
        await this.timelineRepository.update(timeline);

        return { event };
    }
}
