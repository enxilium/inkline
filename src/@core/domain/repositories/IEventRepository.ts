import { Event } from "../entities/story/timeline/Event";

export interface IEventRepository {
    create(timelineId: string, event: Event): Promise<void>;
    findById(id: string): Promise<Event | null>;
    findByTimelineId(timelineId: string): Promise<Event[]>;
    update(event: Event): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByTimelineId(timelineId: string): Promise<void>;
}
