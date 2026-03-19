import { IMetafieldAssignmentRepository } from "../../../@core/domain/repositories/IMetafieldAssignmentRepository";
import {
    MetafieldAssignment,
    MetafieldAssignableEntityType,
} from "../../../@core/domain/entities/story/world/MetafieldAssignment";
import { SupabaseMetafieldAssignmentRepository } from "../SupabaseMetafieldAssignmentRepository";
import { FileSystemMetafieldAssignmentRepository } from "../filesystem/FileSystemMetafieldAssignmentRepository";
import { deletionLog } from "./DeletionLog";
import { pendingUpdates } from "./PendingUpdates";

export class OfflineFirstMetafieldAssignmentRepository implements IMetafieldAssignmentRepository {
    constructor(
        private supabaseRepo: SupabaseMetafieldAssignmentRepository,
        private fsRepo: FileSystemMetafieldAssignmentRepository,
    ) {}

    async create(assignment: MetafieldAssignment): Promise<void> {
        await this.fsRepo.create(assignment);
        try {
            await this.supabaseRepo.create(assignment);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "metafieldAssignment",
                entityId: assignment.id,
                projectId: assignment.projectId,
                operation: "create",
                payload: assignment,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn(
                "Failed to create metafield assignment in Supabase (Offline?)",
                error,
            );
        }
    }

    async findById(id: string): Promise<MetafieldAssignment | null> {
        let remote: MetafieldAssignment | null = null;
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

    async findByProjectId(projectId: string): Promise<MetafieldAssignment[]> {
        let remote: MetafieldAssignment[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        for (const assignment of merged) {
            const isRemoteOnly =
                remote.some((item) => item.id === assignment.id) &&
                !local.some((item) => item.id === assignment.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(assignment);
            }
        }

        return merged.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
    }

    async findByDefinitionId(
        definitionId: string,
    ): Promise<MetafieldAssignment[]> {
        let remote: MetafieldAssignment[] = [];
        try {
            remote = await this.supabaseRepo.findByDefinitionId(definitionId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findAll();
        const merged = this.mergeByMostRecent(local, remote);
        return merged
            .filter((assignment) => assignment.definitionId === definitionId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    async findByEntity(
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment[]> {
        let remote: MetafieldAssignment[] = [];
        try {
            remote = await this.supabaseRepo.findByEntity(entityType, entityId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findAll();
        const merged = this.mergeByMostRecent(local, remote);
        const allAssignments = merged;
        return allAssignments
            .filter(
                (assignment) =>
                    assignment.entityType === entityType &&
                    assignment.entityId === entityId,
            )
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    async findByDefinitionAndEntity(
        definitionId: string,
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment | null> {
        let remote: MetafieldAssignment | null = null;
        try {
            remote = await this.supabaseRepo.findByDefinitionAndEntity(
                definitionId,
                entityType,
                entityId,
            );
        } catch {
            // Offline
        }

        const localAssignments = await this.fsRepo.findAll();
        const local =
            localAssignments.find(
                (assignment) =>
                    assignment.definitionId === definitionId &&
                    assignment.entityType === entityType &&
                    assignment.entityId === entityId,
            ) ?? null;

        return this.pickMostRecent(local, remote);
    }

    async update(assignment: MetafieldAssignment): Promise<void> {
        await this.fsRepo.update(assignment);
        try {
            await this.supabaseRepo.update(assignment);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "metafieldAssignment",
                entityId: assignment.id,
                projectId: assignment.projectId,
                operation: "update",
                payload: assignment,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn(
                "Failed to update metafield assignment in Supabase (Offline?)",
                error,
            );
        }
    }

    async delete(id: string): Promise<void> {
        const existing = await this.findById(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "metafieldAssignment",
            entityId: id,
            projectId: existing?.projectId ?? "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete metafield assignment in Supabase (Offline?)",
                error,
            );
        }
    }

    async deleteByDefinitionId(definitionId: string): Promise<void> {
        const assignments = await this.findByDefinitionId(definitionId);
        const timestamp = Date.now();

        for (const assignment of assignments) {
            await this.fsRepo.delete(assignment.id);
            await deletionLog.add({
                entityType: "metafieldAssignment",
                entityId: assignment.id,
                projectId: assignment.projectId,
                timestamp,
            });
        }

        try {
            await this.supabaseRepo.deleteByDefinitionId(definitionId);
            for (const assignment of assignments) {
                await deletionLog.remove(assignment.id);
            }
        } catch (error) {
            console.warn(
                "Failed to delete metafield assignments in Supabase (Offline?)",
                error,
            );
        }
    }

    private pickMostRecent(
        local: MetafieldAssignment | null,
        remote: MetafieldAssignment | null,
    ): MetafieldAssignment | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }

        return local || remote;
    }

    private mergeByMostRecent(
        local: MetafieldAssignment[],
        remote: MetafieldAssignment[],
    ): MetafieldAssignment[] {
        const map = new Map<string, MetafieldAssignment>();

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
