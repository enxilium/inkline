import { IEventRepository } from "../../../@core/domain/repositories/IEventRepository";
import { Event } from "../../../@core/domain/entities/story/timeline/Event";
import { SupabaseEventRepository } from "../SupabaseEventRepository";
import { FileSystemEventRepository } from "../filesystem/FileSystemEventRepository";

export class OfflineFirstEventRepository implements IEventRepository {
    constructor(
        private readonly supabaseRepo: SupabaseEventRepository,
        private readonly fsRepo: FileSystemEventRepository,
    ) {}

    async create(timelineId: string, event: Event): Promise<void> {
        await this.fsRepo.create(timelineId, event);

        try {
            await this.supabaseRepo.create(timelineId, event);
        } catch (error) {
            console.warn(
                "Failed to create event in Supabase (Offline?)",
                error,
            );
        }
    }

    async findById(id: string): Promise<Event | null> {
        let remote: Event | null = null;
        try {
            remote = await this.supabaseRepo.findById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findById(id);
        const result = this.pickMostRecent(local, remote);

        if (result && result === remote && !local) {
            await this.fsRepo.create(result.timelineId, result);
        }

        return result;
    }

    async findByTimelineId(timelineId: string): Promise<Event[]> {
        let remote: Event[] = [];
        try {
            remote = await this.supabaseRepo.findByTimelineId(timelineId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByTimelineId(timelineId);
        const merged = this.mergeByMostRecent(local, remote);

        for (const event of merged) {
            const isRemoteOnly =
                remote.some((item) => item.id === event.id) &&
                !local.some((item) => item.id === event.id);

            if (isRemoteOnly) {
                await this.fsRepo.create(timelineId, event);
            }
        }

        return merged;
    }

    async update(event: Event): Promise<void> {
        await this.fsRepo.update(event);

        try {
            await this.supabaseRepo.update(event);
        } catch (error) {
            console.warn(
                "Failed to update event in Supabase (Offline?)",
                error,
            );
        }
    }

    async delete(id: string): Promise<void> {
        await this.fsRepo.delete(id);

        try {
            await this.supabaseRepo.delete(id);
        } catch (error) {
            console.warn(
                "Failed to delete event in Supabase (Offline?)",
                error,
            );
        }
    }

    async deleteByTimelineId(timelineId: string): Promise<void> {
        await this.fsRepo.deleteByTimelineId(timelineId);

        try {
            await this.supabaseRepo.deleteByTimelineId(timelineId);
        } catch (error) {
            console.warn(
                "Failed to delete events in Supabase (Offline?)",
                error,
            );
        }
    }

    private pickMostRecent(
        local: Event | null,
        remote: Event | null,
    ): Event | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }

        return local || remote;
    }

    private mergeByMostRecent(local: Event[], remote: Event[]): Event[] {
        const map = new Map<string, Event>();

        for (const item of local) {
            map.set(item.id, item);
        }

        for (const item of remote) {
            const existing = map.get(item.id);
            if (!existing || item.updatedAt > existing.updatedAt) {
                map.set(item.id, item);
            }
        }

        return Array.from(map.values());
    }
}
