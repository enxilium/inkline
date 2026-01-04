import { Timeline } from "../entities/story/timeline/Timeline";

export interface ITimelineRepository {
    create(projectId: string, timeline: Timeline): Promise<void>;
    findById(id: string): Promise<Timeline | null>;
    findByProjectId(projectId: string): Promise<Timeline[]>;
    update(timeline: Timeline): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
}
