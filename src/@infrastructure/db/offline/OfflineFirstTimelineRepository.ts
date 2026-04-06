import { ITimelineRepository } from "../../../@core/domain/repositories/ITimelineRepository";
import { Timeline } from "../../../@core/domain/entities/story/timeline/Timeline";
import { SupabaseTimelineRepository } from "../SupabaseTimelineRepository";
import { FileSystemTimelineRepository } from "../filesystem/FileSystemTimelineRepository";

export class OfflineFirstTimelineRepository implements ITimelineRepository {
    constructor(
        private readonly supabaseRepo: SupabaseTimelineRepository,
        private readonly fsRepo: FileSystemTimelineRepository,
    ) {}

    async create(projectId: string, timeline: Timeline): Promise<void> {
        await this.fsRepo.create(projectId, timeline);

        try {
            await this.supabaseRepo.create(projectId, timeline);
        } catch (error) {
            console.warn(
                "Failed to create timeline in Supabase (Offline?)",
                error,
            );
        }
    }

    async findById(id: string): Promise<Timeline | null> {
        let remote: Timeline | null = null;
        try {
            remote = await this.supabaseRepo.findById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findById(id);
        const result = this.pickMostRecent(local, remote);

        if (result && result === remote && !local) {
            await this.fsRepo.create(result.projectId, result);
        }

        return result;
    }

    async findByProjectId(projectId: string): Promise<Timeline[]> {
        let remote: Timeline[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        for (const timeline of merged) {
            const isRemoteOnly =
                remote.some((item) => item.id === timeline.id) &&
                !local.some((item) => item.id === timeline.id);

            if (isRemoteOnly) {
                await this.fsRepo.create(projectId, timeline);
            }
        }

        return merged;
    }

    async update(timeline: Timeline): Promise<void> {
        await this.fsRepo.update(timeline);

        try {
            await this.supabaseRepo.update(timeline);
        } catch (error) {
            console.warn(
                "Failed to update timeline in Supabase (Offline?)",
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
                "Failed to delete timeline in Supabase (Offline?)",
                error,
            );
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        await this.fsRepo.deleteByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteByProjectId(projectId);
        } catch (error) {
            console.warn(
                "Failed to delete timelines in Supabase (Offline?)",
                error,
            );
        }
    }

    private pickMostRecent(
        local: Timeline | null,
        remote: Timeline | null,
    ): Timeline | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }

        return local || remote;
    }

    private mergeByMostRecent(
        local: Timeline[],
        remote: Timeline[],
    ): Timeline[] {
        const map = new Map<string, Timeline>();

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
