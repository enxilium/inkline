import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IEventRepository } from "../../../domain/repositories/IEventRepository";
import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";
import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";

export interface DeleteEventRequest {
    eventId: string;
    timelineId: string;
}

export class DeleteEvent {
    constructor(
        private readonly eventRepository: IEventRepository,
        private readonly timelineRepository: ITimelineRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly scrapNoteRepository: IScrapNoteRepository
    ) {}

    async execute(request: DeleteEventRequest): Promise<void> {
        const { eventId, timelineId } = request;

        if (!eventId.trim()) {
            throw new Error("Event ID is required.");
        }

        const event = await this.eventRepository.findById(eventId);
        if (!event) {
            throw new Error("Event not found.");
        }

        const timeline = await this.timelineRepository.findById(timelineId);
        if (!timeline) {
            throw new Error("Timeline not found.");
        }

        // Remove association from Chapter/ScrapNote
        if (event.type === "chapter" && event.associatedId) {
            const chapter = await this.chapterRepository.findById(
                event.associatedId
            );
            if (chapter) {
                chapter.eventId = null;
                chapter.updatedAt = new Date();
                await this.chapterRepository.update(chapter);
            }
        } else if (event.type === "scrap_note" && event.associatedId) {
            const scrapNote = await this.scrapNoteRepository.findById(
                event.associatedId
            );
            if (scrapNote) {
                scrapNote.eventId = null;
                scrapNote.updatedAt = new Date();
                await this.scrapNoteRepository.update(scrapNote);
            }
        }

        await this.eventRepository.delete(eventId);

        timeline.eventIds = timeline.eventIds.filter((id) => id !== eventId);
        timeline.updatedAt = new Date();
        await this.timelineRepository.update(timeline);
    }
}
