import { IScrapNoteRepository } from "../../../@core/domain/repositories/IScrapNoteRepository";
import { ScrapNote } from "../../../@core/domain/entities/story/ScrapNote";
import { SupabaseScrapNoteRepository } from "../SupabaseScrapNoteRepository";
import { FileSystemScrapNoteRepository } from "../filesystem/FileSystemScrapNoteRepository";
import { SupabaseService } from "../SupabaseService";

import { deletionLog } from "./DeletionLog";

/**
 * Offline-first scrap note repository that uses local filesystem as primary storage
 * and syncs with Supabase when online. Uses "most recent wins" for conflict resolution.
 */
export class OfflineFirstScrapNoteRepository implements IScrapNoteRepository {
    constructor(
        private supabaseRepo: SupabaseScrapNoteRepository,
        private fsRepo: FileSystemScrapNoteRepository
    ) {}

    async create(projectId: string, note: ScrapNote): Promise<void> {
        await this.fsRepo.create(projectId, note);
        try {
            await this.supabaseRepo.create(projectId, note);
        } catch (error) {
            console.warn(
                "Failed to create scrap note in Supabase (Offline?)",
                error
            );
        }
    }

    async findById(id: string): Promise<ScrapNote | null> {
        let remote: ScrapNote | null = null;
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

    async findByProjectId(projectId: string): Promise<ScrapNote[]> {
        let remote: ScrapNote[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        // Persist any remote-only notes locally for offline access
        for (const note of merged) {
            const isRemoteOnly =
                remote.some((r) => r.id === note.id) &&
                !local.some((l) => l.id === note.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(projectId, note);
            }
        }

        return merged;
    }

    async updateContent(noteId: string, content: string): Promise<void> {
        await this.fsRepo.updateContent(noteId, content);
        try {
            await this.supabaseRepo.updateContent(noteId, content);
        } catch (error) {
            console.warn(
                "Failed to update scrap note content in Supabase (Offline?)",
                error
            );
        }
    }

    async update(note: ScrapNote): Promise<void> {
        await this.fsRepo.update(note);
        try {
            await this.supabaseRepo.update(note);
        } catch (error) {
            console.warn(
                "Failed to update scrap note in Supabase (Offline?)",
                error
            );
        }
    }

    async delete(id: string): Promise<void> {
        const projectId = await this.getProjectId(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "scrapNote",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete scrap note in Supabase (Offline?)",
                error
            );
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        // Get all notes first so we can log their deletions
        const notes = await this.fsRepo.findByProjectId(projectId);
        const timestamp = Date.now();

        for (const note of notes) {
            await deletionLog.add({
                entityType: "scrapNote",
                entityId: note.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deleteByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteByProjectId(projectId);
            // Remove from deletion log on success
            for (const note of notes) {
                await deletionLog.remove(note.id);
            }
        } catch (error) {
            console.warn(
                "Failed to delete scrap notes in Supabase (Offline?)",
                error
            );
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Pick the most recently updated entity between local and remote.
     */
    private pickMostRecent(
        local: ScrapNote | null,
        remote: ScrapNote | null
    ): ScrapNote | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }
        return local || remote;
    }

    /**
     * Merge local and remote arrays, keeping the most recently updated version of each entity.
     */
    private mergeByMostRecent(
        local: ScrapNote[],
        remote: ScrapNote[]
    ): ScrapNote[] {
        const map = new Map<string, ScrapNote>();

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
    private async getProjectId(noteId: string): Promise<string | null> {
        return this.getRemoteProjectId(noteId);
    }

    private async getRemoteProjectId(id: string): Promise<string | null> {
        try {
            const client = SupabaseService.getClient();
            const { data } = await client
                .from("scrap_notes")
                .select("project_id")
                .eq("id", id)
                .single();
            return data?.project_id || null;
        } catch {
            return null;
        }
    }
}
