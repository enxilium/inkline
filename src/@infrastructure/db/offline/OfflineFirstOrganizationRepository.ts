import { IOrganizationRepository } from "../../../@core/domain/repositories/IOrganizationRepository";
import { Organization } from "../../../@core/domain/entities/story/world/Organization";
import { SupabaseOrganizationRepository } from "../SupabaseOrganizationRepository";
import { FileSystemOrganizationRepository } from "../filesystem/FileSystemOrganizationRepository";
import { SupabaseService } from "../SupabaseService";

import { deletionLog } from "./DeletionLog";

/**
 * Offline-first organization repository that uses local filesystem as primary storage
 * and syncs with Supabase when online. Uses "most recent wins" for conflict resolution.
 */
export class OfflineFirstOrganizationRepository implements IOrganizationRepository {
    constructor(
        private supabaseRepo: SupabaseOrganizationRepository,
        private fsRepo: FileSystemOrganizationRepository
    ) {}

    async create(projectId: string, organization: Organization): Promise<void> {
        await this.fsRepo.create(projectId, organization);
        try {
            await this.supabaseRepo.create(projectId, organization);
        } catch (error) {
            console.warn("Failed to create organization in Supabase (Offline?)", error);
        }
    }

    async findById(id: string): Promise<Organization | null> {
        let remote: Organization | null = null;
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

    async findByProjectId(projectId: string): Promise<Organization[]> {
        let remote: Organization[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        // Persist any remote-only organizations locally for offline access
        for (const organization of merged) {
            const isRemoteOnly = remote.some(r => r.id === organization.id) && 
                                 !local.some(l => l.id === organization.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(projectId, organization);
            }
        }

        return merged;
    }

    async findByLocationId(locationId: string): Promise<Organization[]> {
        let remote: Organization[] = [];
        try {
            remote = await this.supabaseRepo.findByLocationId(locationId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByLocationId(locationId);
        return this.mergeByMostRecent(local, remote);
    }

    async getOrganizationProfiles(
        projectId: string
    ): Promise<{ id: string; name: string; description: string }[]> {
        const orgs = await this.findByProjectId(projectId);
        return orgs.map((o) => ({
            id: o.id,
            name: o.name,
            description: o.description,
        }));
    }

    async update(organization: Organization): Promise<void> {
        await this.fsRepo.update(organization);
        try {
            await this.supabaseRepo.update(organization);
        } catch (error) {
            console.warn("Failed to update organization in Supabase (Offline?)", error);
        }
    }

    async delete(id: string): Promise<void> {
        const projectId = await this.getProjectId(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "organization",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn("Failed to delete organization in Supabase (Offline?)", error);
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        // Get all organizations first so we can log their deletions
        const organizations = await this.fsRepo.findByProjectId(projectId);
        const timestamp = Date.now();

        for (const organization of organizations) {
            await deletionLog.add({
                entityType: "organization",
                entityId: organization.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deleteByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteByProjectId(projectId);
            // Remove from deletion log on success
            for (const organization of organizations) {
                await deletionLog.remove(organization.id);
            }
        } catch (error) {
            console.warn("Failed to delete organizations in Supabase (Offline?)", error);
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Pick the most recently updated entity between local and remote.
     */
    private pickMostRecent(local: Organization | null, remote: Organization | null): Organization | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }
        return local || remote;
    }

    /**
     * Merge local and remote arrays, keeping the most recently updated version of each entity.
     */
    private mergeByMostRecent(local: Organization[], remote: Organization[]): Organization[] {
        const map = new Map<string, Organization>();

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
    private async getProjectId(organizationId: string): Promise<string | null> {
        return this.getRemoteProjectId(organizationId);
    }

    private async getRemoteProjectId(id: string): Promise<string | null> {
        try {
            const client = SupabaseService.getClient();
            const { data } = await client
                .from("organizations")
                .select("project_id")
                .eq("id", id)
                .single();
            return data?.project_id || null;
        } catch {
            return null;
        }
    }
}
