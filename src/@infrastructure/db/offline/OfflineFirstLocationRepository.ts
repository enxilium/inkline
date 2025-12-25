import { ILocationRepository } from "../../../@core/domain/repositories/ILocationRepository";
import { Location } from "../../../@core/domain/entities/story/world/Location";
import { SupabaseLocationRepository } from "../SupabaseLocationRepository";
import { FileSystemLocationRepository } from "../filesystem/FileSystemLocationRepository";
import { SupabaseService } from "../SupabaseService";

import { deletionLog } from "./DeletionLog";

/**
 * Offline-first location repository that uses local filesystem as primary storage
 * and syncs with Supabase when online. Uses "most recent wins" for conflict resolution.
 */
export class OfflineFirstLocationRepository implements ILocationRepository {
    constructor(
        private supabaseRepo: SupabaseLocationRepository,
        private fsRepo: FileSystemLocationRepository
    ) {}

    async create(projectId: string, location: Location): Promise<void> {
        await this.fsRepo.create(projectId, location);
        try {
            await this.supabaseRepo.create(projectId, location);
        } catch (error) {
            console.warn("Failed to create location in Supabase (Offline?)", error);
        }
    }

    async findById(id: string): Promise<Location | null> {
        let remote: Location | null = null;
        try {
            remote = await this.supabaseRepo.findById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findById(id);
        const result = this.pickMostRecent(local, remote);

        // If remote exists but not locally, persist it locally for offline access
        if (result && result === remote && !local) {
            const projectId = await this.getRemoteProjectId(id);
            if (projectId) {
                await this.fsRepo.create(projectId, remote);
            }
        }

        return result;
    }

    async findByProjectId(projectId: string): Promise<Location[]> {
        let remote: Location[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        // Persist any remote-only locations locally for offline access
        for (const location of merged) {
            const isRemoteOnly = remote.some(r => r.id === location.id) && 
                                 !local.some(l => l.id === location.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(projectId, location);
            }
        }

        return merged;
    }

    async getLocationProfiles(
        projectId: string
    ): Promise<{ id: string; name: string; description: string }[]> {
        const locations = await this.findByProjectId(projectId);
        return locations.map((l) => ({
            id: l.id,
            name: l.name,
            description: l.description,
        }));
    }

    async update(location: Location): Promise<void> {
        await this.fsRepo.update(location);
        try {
            await this.supabaseRepo.update(location);
        } catch (error) {
            console.warn("Failed to update location in Supabase (Offline?)", error);
        }
    }

    async delete(id: string): Promise<void> {
        const projectId = await this.getProjectId(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "location",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn("Failed to delete location in Supabase (Offline?)", error);
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        // Get all locations first so we can log their deletions
        const locations = await this.fsRepo.findByProjectId(projectId);
        const timestamp = Date.now();

        for (const location of locations) {
            await deletionLog.add({
                entityType: "location",
                entityId: location.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deleteByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteByProjectId(projectId);
            // Remove from deletion log on success
            for (const location of locations) {
                await deletionLog.remove(location.id);
            }
        } catch (error) {
            console.warn("Failed to delete locations in Supabase (Offline?)", error);
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Pick the most recently updated entity between local and remote.
     */
    private pickMostRecent(local: Location | null, remote: Location | null): Location | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }
        return local || remote;
    }

    /**
     * Merge local and remote arrays, keeping the most recently updated version of each entity.
     */
    private mergeByMostRecent(local: Location[], remote: Location[]): Location[] {
        const map = new Map<string, Location>();

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

    /**
     * Get projectId from local storage or remote.
     */
    private async getProjectId(locationId: string): Promise<string | null> {
        return this.getRemoteProjectId(locationId);
    }

    private async getRemoteProjectId(locationId: string): Promise<string | null> {
        try {
            const client = SupabaseService.getClient();
            const { data } = await client
                .from("locations")
                .select("project_id")
                .eq("id", locationId)
                .single();
            return data?.project_id || null;
        } catch {
            return null;
        }
    }
}
