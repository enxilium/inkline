import { IEventRepository } from "../../@core/domain/repositories/IEventRepository";
import {
    Event,
    EventType,
} from "../../@core/domain/entities/story/timeline/Event";
import { SupabaseService } from "./SupabaseService";

type EventRow = {
    id: string;
    timeline_id: string;
    title: string;
    description: string;
    time: number;
    year: number;
    month: number | null;
    day: number | null;
    type: string;
    associated_id: string | null;
    character_ids: string[];
    location_ids: string[];
    organization_ids: string[];
    created_at: string;
    updated_at: string;
};

const mapRowToEvent = (row: EventRow): Event =>
    new Event(
        row.id,
        row.timeline_id,
        row.title,
        row.description,
        row.time,
        row.year ?? row.time, // Fallback to time for backward compatibility
        row.month,
        row.day,
        row.type as EventType,
        row.associated_id,
        row.character_ids ?? [],
        row.location_ids ?? [],
        row.organization_ids ?? [],
        new Date(row.created_at),
        new Date(row.updated_at)
    );

export class SupabaseEventRepository implements IEventRepository {
    async create(timelineId: string, event: Event): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("events").insert({
            id: event.id,
            timeline_id: timelineId,
            title: event.title,
            description: event.description,
            time: event.time,
            year: event.year,
            month: event.month,
            day: event.day,
            type: event.type,
            associated_id: event.associatedId,
            character_ids: event.characterIds,
            location_ids: event.locationIds,
            organization_ids: event.organizationIds,
            created_at: event.createdAt.toISOString(),
            updated_at: event.updatedAt.toISOString(),
        });

        if (error) {
            throw new Error(`Failed to create event: ${error.message}`);
        }
    }

    async findById(id: string): Promise<Event | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("events")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null; // Not found
            throw new Error(`Failed to find event: ${error.message}`);
        }

        return mapRowToEvent(data as EventRow);
    }

    async findByTimelineId(timelineId: string): Promise<Event[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("events")
            .select("*")
            .eq("timeline_id", timelineId);

        if (error) {
            throw new Error(`Failed to find events: ${error.message}`);
        }

        return (data as EventRow[]).map(mapRowToEvent);
    }

    async update(event: Event): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("events")
            .update({
                title: event.title,
                description: event.description,
                time: event.time,
                year: event.year,
                month: event.month,
                day: event.day,
                type: event.type,
                associated_id: event.associatedId,
                character_ids: event.characterIds,
                location_ids: event.locationIds,
                organization_ids: event.organizationIds,
                updated_at: event.updatedAt.toISOString(),
            })
            .eq("id", event.id);

        if (error) {
            throw new Error(`Failed to update event: ${error.message}`);
        }
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("events").delete().eq("id", id);

        if (error) {
            throw new Error(`Failed to delete event: ${error.message}`);
        }
    }

    async deleteByTimelineId(timelineId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("events")
            .delete()
            .eq("timeline_id", timelineId);

        if (error) {
            throw new Error(
                `Failed to delete events by timeline: ${error.message}`
            );
        }
    }
}
