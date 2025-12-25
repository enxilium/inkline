import { ICharacterRepository } from "../../../@core/domain/repositories/ICharacterRepository";
import { Character } from "../../../@core/domain/entities/story/world/Character";
import { SupabaseCharacterRepository } from "../SupabaseCharacterRepository";
import { FileSystemCharacterRepository } from "../filesystem/FileSystemCharacterRepository";
import { SupabaseService } from "../SupabaseService";

import { deletionLog } from "./DeletionLog";

/**
 * Offline-first character repository that uses local filesystem as primary storage
 * and syncs with Supabase when online. Uses "most recent wins" for conflict resolution.
 */
export class OfflineFirstCharacterRepository implements ICharacterRepository {
    constructor(
        private supabaseRepo: SupabaseCharacterRepository,
        private fsRepo: FileSystemCharacterRepository
    ) {}

    async create(projectId: string, character: Character): Promise<void> {
        await this.fsRepo.create(projectId, character);
        try {
            await this.supabaseRepo.create(projectId, character);
        } catch (error) {
            console.warn(
                "Failed to create character in Supabase (Offline?)",
                error
            );
        }
    }

    async findById(id: string): Promise<Character | null> {
        let remote: Character | null = null;
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

    async findByProjectId(projectId: string): Promise<Character[]> {
        let remote: Character[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        // Persist any remote-only characters locally for offline access
        for (const character of merged) {
            const isRemoteOnly =
                remote.some((r) => r.id === character.id) &&
                !local.some((l) => l.id === character.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(projectId, character);
            }
        }

        return merged;
    }

    async update(character: Character): Promise<void> {
        await this.fsRepo.update(character);
        try {
            await this.supabaseRepo.update(character);
        } catch (error) {
            console.warn(
                "Failed to update character in Supabase (Offline?)",
                error
            );
        }
    }

    async delete(id: string): Promise<void> {
        const projectId = await this.getProjectId(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "character",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete character in Supabase (Offline?)",
                error
            );
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        // Get all characters first so we can log their deletions
        const characters = await this.fsRepo.findByProjectId(projectId);
        const timestamp = Date.now();

        for (const character of characters) {
            await deletionLog.add({
                entityType: "character",
                entityId: character.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deleteByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteByProjectId(projectId);
            // Remove from deletion log on success
            for (const character of characters) {
                await deletionLog.remove(character.id);
            }
        } catch (error) {
            console.warn(
                "Failed to delete characters in Supabase (Offline?)",
                error
            );
        }
    }

    async getCharacterProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]> {
        // Use local for speed since we sync on load
        return this.fsRepo.getCharacterProfiles(projectId);
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Pick the most recently updated entity between local and remote.
     */
    private pickMostRecent(
        local: Character | null,
        remote: Character | null
    ): Character | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }
        return local || remote;
    }

    /**
     * Merge local and remote arrays, keeping the most recently updated version of each entity.
     */
    private mergeByMostRecent(
        local: Character[],
        remote: Character[]
    ): Character[] {
        const map = new Map<string, Character>();

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
    private async getProjectId(characterId: string): Promise<string | null> {
        return this.getRemoteProjectId(characterId);
    }

    private async getRemoteProjectId(
        characterId: string
    ): Promise<string | null> {
        try {
            const client = SupabaseService.getClient();
            const { data } = await client
                .from("characters")
                .select("project_id")
                .eq("id", characterId)
                .single();
            return data?.project_id || null;
        } catch {
            return null;
        }
    }
}
