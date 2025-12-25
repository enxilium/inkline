import { IProjectRepository } from "../../../@core/domain/repositories/IProjectRepository";
import { Project } from "../../../@core/domain/entities/story/Project";
import { SupabaseProjectRepository } from "../SupabaseProjectRepository";
import { FileSystemProjectRepository } from "../filesystem/FileSystemProjectRepository";

/**
 * Offline-first project repository that uses local filesystem as primary storage
 * and syncs with Supabase when online. Uses "most recent wins" for conflict resolution.
 * 
 * Note: Projects don't use the deletion log because project deletion is a high-level
 * operation that cascades to all child entities, which are individually logged.
 */
export class OfflineFirstProjectRepository implements IProjectRepository {
    constructor(
        private supabaseRepo: SupabaseProjectRepository,
        private fsRepo: FileSystemProjectRepository
    ) {}

    async create(ownerId: string, project: Project): Promise<void> {
        await this.fsRepo.create(ownerId, project);
        try {
            await this.supabaseRepo.create(ownerId, project);
        } catch (error) {
            console.warn("Failed to create project in Supabase (Offline?)", error);
        }
    }

    async findById(id: string): Promise<Project | null> {
        let remote: Project | null = null;
        try {
            remote = await this.supabaseRepo.findById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findById(id);
        const result = this.pickMostRecent(local, remote);

        // If remote exists but not locally, persist it locally for offline access
        if (result && result === remote && !local) {
            const ownerId = await this.getRemoteOwnerId(id);
            if (ownerId) {
                await this.fsRepo.create(ownerId, remote);
            }
        }

        return result;
    }

    async findAllByUserId(userId: string): Promise<Project[]> {
        let remote: Project[] = [];
        try {
            remote = await this.supabaseRepo.findAllByUserId(userId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findAllByUserId(userId);
        const merged = this.mergeByMostRecent(local, remote);

        // Persist any remote-only projects locally for offline access
        for (const project of merged) {
            const isRemoteOnly = remote.some(r => r.id === project.id) && 
                                 !local.some(l => l.id === project.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(userId, project);
            }
        }

        return merged;
    }

    async update(project: Project): Promise<void> {
        await this.fsRepo.update(project);
        try {
            await this.supabaseRepo.update(project);
        } catch (error) {
            console.warn("Failed to update project in Supabase (Offline?)", error);
        }
    }

    async delete(id: string): Promise<void> {
        // Note: Project deletion doesn't use the deletion log directly.
        // Child entity deletions are handled by their respective deleteByProjectId methods.
        await this.fsRepo.delete(id);
        try {
            await this.supabaseRepo.delete(id);
        } catch (error) {
            console.warn("Failed to delete project in Supabase (Offline?)", error);
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Pick the most recently updated entity between local and remote.
     */
    private pickMostRecent(local: Project | null, remote: Project | null): Project | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }
        return local || remote;
    }

    /**
     * Merge local and remote arrays, keeping the most recently updated version of each entity.
     */
    private mergeByMostRecent(local: Project[], remote: Project[]): Project[] {
        const map = new Map<string, Project>();

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

    private async getRemoteOwnerId(projectId: string): Promise<string | null> {
        try {
            const { SupabaseService } = await import("../SupabaseService");
            const client = SupabaseService.getClient();
            const { data } = await client
                .from("projects")
                .select("user_id")
                .eq("id", projectId)
                .single();
            return data?.user_id || null;
        } catch {
            return null;
        }
    }
}
