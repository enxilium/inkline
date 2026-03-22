import { IEditorTemplateRepository } from "../../../@core/domain/repositories/IEditorTemplateRepository";
import {
    EditorTemplate,
    EditorTemplateType,
} from "../../../@core/domain/entities/story/world/EditorTemplate";
import { SupabaseEditorTemplateRepository } from "../SupabaseEditorTemplateRepository";
import { FileSystemEditorTemplateRepository } from "../filesystem/FileSystemEditorTemplateRepository";
import { pendingUpdates } from "./PendingUpdates";
import { deletionLog } from "./DeletionLog";

export class OfflineFirstEditorTemplateRepository
    implements IEditorTemplateRepository
{
    constructor(
        private supabaseRepo: SupabaseEditorTemplateRepository,
        private fsRepo: FileSystemEditorTemplateRepository,
    ) {}

    async create(template: EditorTemplate): Promise<void> {
        await this.fsRepo.create(template);
        try {
            await this.supabaseRepo.create(template);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "editorTemplate",
                entityId: template.id,
                projectId: template.projectId,
                operation: "create",
                payload: template,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn(
                "Failed to create editor template in Supabase (Offline?)",
                error,
            );
        }
    }

    async findById(id: string): Promise<EditorTemplate | null> {
        let remote: EditorTemplate | null = null;
        try {
            remote = await this.supabaseRepo.findById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findById(id);
        const result = this.pickMostRecent(local, remote);

        if (result && result === remote && !local) {
            await this.fsRepo.create(result);
        }

        return result;
    }

    async findByProjectId(projectId: string): Promise<EditorTemplate[]> {
        let remote: EditorTemplate[] = [];
        try {
            remote = await this.supabaseRepo.findByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findByProjectId(projectId);
        const merged = this.mergeByMostRecent(local, remote);

        for (const template of merged) {
            const isRemoteOnly =
                remote.some((item) => item.id === template.id) &&
                !local.some((item) => item.id === template.id);
            if (isRemoteOnly) {
                await this.fsRepo.create(template);
            }
        }

        return merged.sort((a, b) => a.editorType.localeCompare(b.editorType));
    }

    async findByProjectAndEditorType(
        projectId: string,
        editorType: EditorTemplateType,
    ): Promise<EditorTemplate | null> {
        const templates = await this.findByProjectId(projectId);
        return (
            templates.find((template) => template.editorType === editorType) ??
            null
        );
    }

    async update(template: EditorTemplate): Promise<void> {
        await this.fsRepo.update(template);
        try {
            await this.supabaseRepo.update(template);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "editorTemplate",
                entityId: template.id,
                projectId: template.projectId,
                operation: "update",
                payload: template,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn(
                "Failed to update editor template in Supabase (Offline?)",
                error,
            );
        }
    }

    async delete(id: string): Promise<void> {
        const existing = await this.findById(id);

        await this.fsRepo.delete(id);
        await deletionLog.add({
            entityType: "editorTemplate",
            entityId: id,
            projectId: existing?.projectId ?? "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.delete(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete editor template in Supabase (Offline?)",
                error,
            );
        }
    }

    private pickMostRecent(
        local: EditorTemplate | null,
        remote: EditorTemplate | null,
    ): EditorTemplate | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }

        return local || remote;
    }

    private mergeByMostRecent(
        local: EditorTemplate[],
        remote: EditorTemplate[],
    ): EditorTemplate[] {
        const map = new Map<string, EditorTemplate>();

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
