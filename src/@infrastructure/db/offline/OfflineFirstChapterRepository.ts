import { IChapterRepository } from "../../../@core/domain/repositories/IChapterRepository";
import { Chapter } from "../../../@core/domain/entities/story/Chapter";
import { SupabaseChapterRepository } from "../SupabaseChapterRepository";
import { FileSystemChapterRepository } from "../filesystem/FileSystemChapterRepository";
import { SupabaseService } from "../SupabaseService";

import { deletionLog } from "./DeletionLog";

/**
 * Offline-first chapter repository that uses local filesystem as primary storage
 * and syncs with Supabase when online. Uses "most recent wins" for conflict resolution.
 */
export class OfflineFirstChapterRepository implements IChapterRepository {
    constructor(
        private supabaseRepo: SupabaseChapterRepository,
        private fsRepo: FileSystemChapterRepository
    ) {}

    async create(projectId: string, chapter: Chapter): Promise<void> {
        await this.fsRepo.create(projectId, chapter);
        try {
            await this.supabaseRepo.create(projectId, chapter);
        } catch (error) {
            console.warn(
                "Failed to create chapter in Supabase (Offline?)",
                error
            );
        }
    }

    async findById(id: string): Promise<Chapter | null> {
        let remote: Chapter | null = null;
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

    async findByProjectId(projectId: string): Promise<Chapter[]> {
        let remote: Chapter[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        // Persist any remote-only chapters locally for offline access
        for (const chapter of merged) {
            const isRemoteOnly =
                remote.some((r) => r.id === chapter.id) &&
                !local.some((l) => l.id === chapter.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(projectId, chapter);
            }
        }

        return merged.sort((a, b) => a.order - b.order);
    }

    async updateContent(
        chapterId: string,
        content: string,
        updatedAt?: Date
    ): Promise<void> {
        // Check if content actually changed to avoid phantom updates
        const current = await this.fsRepo.findById(chapterId);
        if (current && current.content === content) {
            return;
        }

        const timestamp = updatedAt || new Date();
        await this.fsRepo.updateContent(chapterId, content, timestamp);
        try {
            const local = await this.fsRepo.findById(chapterId);
            if (local) {
                // We can either call update() or updateContent().
                // updateContent is more efficient if we just changed content.
                // But we need to ensure Supabase gets the same timestamp.
                await this.supabaseRepo.updateContent(
                    chapterId,
                    content,
                    timestamp
                );
            }
        } catch (error) {
            console.warn(
                "Failed to update chapter content in Supabase (Offline?)",
                error
            );
        }
    }

    async update(chapter: Chapter): Promise<void> {
        await this.fsRepo.update(chapter);
        try {
            await this.supabaseRepo.update(chapter);
        } catch (error) {
            console.warn(
                "Failed to update chapter in Supabase (Offline?)",
                error
            );
        }
    }

    async delete(id: string): Promise<void> {
        const projectId = await this.getProjectId(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "chapter",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete chapter in Supabase (Offline?)",
                error
            );
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        // Get all chapters first so we can log their deletions
        const chapters = await this.fsRepo.findByProjectId(projectId);
        const timestamp = Date.now();

        for (const chapter of chapters) {
            await deletionLog.add({
                entityType: "chapter",
                entityId: chapter.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deleteByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteByProjectId(projectId);
            // Remove from deletion log on success
            for (const chapter of chapters) {
                await deletionLog.remove(chapter.id);
            }
        } catch (error) {
            console.warn(
                "Failed to delete chapters in Supabase (Offline?)",
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
        local: Chapter | null,
        remote: Chapter | null
    ): Chapter | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }
        return local || remote;
    }

    /**
     * Merge local and remote arrays, keeping the most recently updated version of each entity.
     */
    private mergeByMostRecent(local: Chapter[], remote: Chapter[]): Chapter[] {
        const map = new Map<string, Chapter>();

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
    private async getProjectId(chapterId: string): Promise<string | null> {
        // Try local first
        const local = await this.fsRepo.findById(chapterId);
        if (local) {
            return this.getLocalProjectId(chapterId);
        }
        // Try remote
        return this.getRemoteProjectId(chapterId);
    }

    /**
     * Get projectId by scanning local file location.
     */
    private async getLocalProjectId(chapterId: string): Promise<string | null> {
        // The FileSystemChapterRepository stores files at:
        // users/{userId}/projects/{projectId}/chapters/{chapterId}.json
        // We need to find the projectId from the chapter file location
        // This is handled internally by FileSystemChapterRepository's findFileLocation
        // For now, we'll query remote as fallback
        return this.getRemoteProjectId(chapterId);
    }

    private async getRemoteProjectId(
        chapterId: string
    ): Promise<string | null> {
        try {
            const client = SupabaseService.getClient();
            const { data } = await client
                .from("chapters")
                .select("project_id")
                .eq("id", chapterId)
                .single();
            return data?.project_id || null;
        } catch {
            return null;
        }
    }
}
