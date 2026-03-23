import { IMetafieldDefinitionRepository } from "../../../@core/domain/repositories/IMetafieldDefinitionRepository";
import {
    MetafieldDefinition,
    MetafieldScope,
} from "../../../@core/domain/entities/story/world/MetafieldDefinition";
import { normalizeMetafieldName } from "../../../@core/application/utils/normalizeMetafieldName";
import { SupabaseMetafieldDefinitionRepository } from "../SupabaseMetafieldDefinitionRepository";
import { FileSystemMetafieldDefinitionRepository } from "../filesystem/FileSystemMetafieldDefinitionRepository";
import { deletionLog } from "./DeletionLog";
import { pendingUpdates } from "./PendingUpdates";

export class OfflineFirstMetafieldDefinitionRepository implements IMetafieldDefinitionRepository {
    constructor(
        private supabaseRepo: SupabaseMetafieldDefinitionRepository,
        private fsRepo: FileSystemMetafieldDefinitionRepository,
    ) {}

    async create(definition: MetafieldDefinition): Promise<void> {
        await this.fsRepo.create(definition);
        try {
            await this.supabaseRepo.create(definition);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "metafieldDefinition",
                entityId: definition.id,
                projectId: definition.projectId,
                operation: "create",
                payload: definition,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn(
                "Failed to create metafield definition in Supabase (Offline?)",
                error,
            );
        }
    }

    async findById(id: string): Promise<MetafieldDefinition | null> {
        let remote: MetafieldDefinition | null = null;
        try {
            remote = await this.supabaseRepo.findById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findById(id);
        const result = this.pickMostRecent(local, remote);

        if (result && result === remote && !local) {
            await this.fsRepo.create(remote);
        }

        return result;
    }

    async findByProjectId(projectId: string): Promise<MetafieldDefinition[]> {
        let remote: MetafieldDefinition[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        for (const definition of merged) {
            const isRemoteOnly =
                remote.some((item) => item.id === definition.id) &&
                !local.some((item) => item.id === definition.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(definition);
            }
        }

        return merged.sort((a, b) => a.name.localeCompare(b.name));
    }

    async findByProjectAndNameNormalized(
        projectId: string,
        nameNormalized: string,
    ): Promise<MetafieldDefinition | null> {
        const normalized = normalizeMetafieldName(nameNormalized);
        const definitions = await this.findByProjectId(projectId);
        return (
            definitions.find(
                (definition) =>
                    normalizeMetafieldName(definition.nameNormalized) ===
                    normalized,
            ) ?? null
        );
    }

    async findByProjectScopeAndNameNormalized(
        projectId: string,
        scope: MetafieldScope,
        nameNormalized: string,
    ): Promise<MetafieldDefinition | null> {
        const normalized = normalizeMetafieldName(nameNormalized);
        const definitions = await this.findByProjectAndScope(projectId, scope);
        return (
            definitions.find(
                (definition) =>
                    normalizeMetafieldName(definition.nameNormalized) ===
                    normalized,
            ) ?? null
        );
    }

    async findByProjectAndScope(
        projectId: string,
        scope: MetafieldScope,
    ): Promise<MetafieldDefinition[]> {
        const definitions = await this.findByProjectId(projectId);
        return definitions.filter((definition) => definition.scope === scope);
    }

    async update(definition: MetafieldDefinition): Promise<void> {
        await this.fsRepo.update(definition);
        try {
            await this.supabaseRepo.update(definition);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "metafieldDefinition",
                entityId: definition.id,
                projectId: definition.projectId,
                operation: "update",
                payload: definition,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn(
                "Failed to update metafield definition in Supabase (Offline?)",
                error,
            );
        }
    }

    async delete(id: string): Promise<void> {
        const existing = await this.findById(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "metafieldDefinition",
            entityId: id,
            projectId: existing?.projectId ?? "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete metafield definition in Supabase (Offline?)",
                error,
            );
        }
    }

    private pickMostRecent(
        local: MetafieldDefinition | null,
        remote: MetafieldDefinition | null,
    ): MetafieldDefinition | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }

        return local || remote;
    }

    private mergeByMostRecent(
        local: MetafieldDefinition[],
        remote: MetafieldDefinition[],
    ): MetafieldDefinition[] {
        const map = new Map<string, MetafieldDefinition>();

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
