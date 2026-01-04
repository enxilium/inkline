import { ITimelineRepository } from "../../@core/domain/repositories/ITimelineRepository";
import { Timeline } from "../../@core/domain/entities/story/timeline/Timeline";
import { SupabaseService } from "./SupabaseService";

type TimelineRow = {
    id: string;
    project_id: string;
    name: string;
    description: string;
    time_unit: string;
    start_value: number;
    event_ids: string[];
    created_at: string;
    updated_at: string;
};

const mapRowToTimeline = (row: TimelineRow): Timeline =>
    new Timeline(
        row.id,
        row.project_id,
        row.name,
        row.description,
        row.time_unit,
        row.start_value ?? 0,
        row.event_ids || [],
        new Date(row.created_at),
        new Date(row.updated_at)
    );

export class SupabaseTimelineRepository implements ITimelineRepository {
    async create(projectId: string, timeline: Timeline): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("timelines").insert({
            id: timeline.id,
            project_id: projectId,
            name: timeline.name,
            description: timeline.description,
            time_unit: timeline.timeUnit,
            start_value: timeline.startValue,
            event_ids: timeline.eventIds,
            created_at: timeline.createdAt.toISOString(),
            updated_at: timeline.updatedAt.toISOString(),
        });

        if (error) {
            throw new Error(`Failed to create timeline: ${error.message}`);
        }
    }

    async findById(id: string): Promise<Timeline | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("timelines")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null; // Not found
            throw new Error(`Failed to find timeline: ${error.message}`);
        }

        return mapRowToTimeline(data as TimelineRow);
    }

    async findByProjectId(projectId: string): Promise<Timeline[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("timelines")
            .select("*")
            .eq("project_id", projectId);

        if (error) {
            throw new Error(`Failed to find timelines: ${error.message}`);
        }

        return (data as TimelineRow[]).map(mapRowToTimeline);
    }

    async update(timeline: Timeline): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("timelines")
            .update({
                name: timeline.name,
                description: timeline.description,
                time_unit: timeline.timeUnit,
                start_value: timeline.startValue,
                event_ids: timeline.eventIds,
                updated_at: timeline.updatedAt.toISOString(),
            })
            .eq("id", timeline.id);

        if (error) {
            throw new Error(`Failed to update timeline: ${error.message}`);
        }
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("timelines").delete().eq("id", id);

        if (error) {
            throw new Error(`Failed to delete timeline: ${error.message}`);
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("timelines")
            .delete()
            .eq("project_id", projectId);

        if (error) {
            throw new Error(
                `Failed to delete timelines by project: ${error.message}`
            );
        }
    }
}
