import { EventEmitter } from "events";
import { SupabaseProjectRepository } from "../db/SupabaseProjectRepository";
import { FileSystemProjectRepository } from "../db/filesystem/FileSystemProjectRepository";
import { SupabaseChapterRepository } from "../db/SupabaseChapterRepository";
import { FileSystemChapterRepository } from "../db/filesystem/FileSystemChapterRepository";
import { SupabaseCharacterRepository } from "../db/SupabaseCharacterRepository";
import { FileSystemCharacterRepository } from "../db/filesystem/FileSystemCharacterRepository";
import { SupabaseLocationRepository } from "../db/SupabaseLocationRepository";
import { FileSystemLocationRepository } from "../db/filesystem/FileSystemLocationRepository";
import { SupabaseOrganizationRepository } from "../db/SupabaseOrganizationRepository";
import { FileSystemOrganizationRepository } from "../db/filesystem/FileSystemOrganizationRepository";
import { SupabaseScrapNoteRepository } from "../db/SupabaseScrapNoteRepository";
import { FileSystemScrapNoteRepository } from "../db/filesystem/FileSystemScrapNoteRepository";
import { SupabaseAssetRepository } from "../db/SupabaseAssetRepository";
import { FileSystemAssetRepository } from "../db/filesystem/FileSystemAssetRepository";
import { SupabaseService } from "../db/SupabaseService";
import { fileSystemService } from "../storage/FileSystemService";
import * as path from "path";
import { Buffer } from "buffer";
import { deletionLog, EntityType } from "../db/offline/DeletionLog";
import { SupabaseDeletionLogRepository } from "../db/SupabaseDeletionLogRepository";

/**
 * SynchronizationService handles bidirectional sync between local filesystem and Supabase.
 * 
 * Conflict Resolution Strategy: "Most Recent Wins"
 * - When syncing, the entity with the most recent updatedAt timestamp is used as the source of truth.
 * - This applies consistently to all entity types (chapters, characters, locations, organizations, 
 *   scrap notes, and assets).
 * 
 * Deletion Handling:
 * - Deletions are tracked in a local deletion log when offline.
 * - On sync, if the remote entity was updated AFTER the deletion timestamp, the deletion is cancelled
 *   and the remote version is restored locally.
 * - Remote deletion logs allow other devices to sync deletions.
 */
export class SynchronizationService extends EventEmitter {
    constructor(
        private supabaseProjectRepo: SupabaseProjectRepository,
        private fsProjectRepo: FileSystemProjectRepository,
        private supabaseChapterRepo: SupabaseChapterRepository,
        private fsChapterRepo: FileSystemChapterRepository,
        private supabaseCharacterRepo: SupabaseCharacterRepository,
        private fsCharacterRepo: FileSystemCharacterRepository,
        private supabaseLocationRepo: SupabaseLocationRepository,
        private fsLocationRepo: FileSystemLocationRepository,
        private supabaseOrganizationRepo: SupabaseOrganizationRepository,
        private fsOrganizationRepo: FileSystemOrganizationRepository,
        private supabaseScrapNoteRepo: SupabaseScrapNoteRepository,
        private fsScrapNoteRepo: FileSystemScrapNoteRepository,
        private supabaseAssetRepo: SupabaseAssetRepository,
        private fsAssetRepo: FileSystemAssetRepository,
        private supabaseDeletionLogRepo: SupabaseDeletionLogRepository
    ) {
        super();
    }

    private syncInterval: NodeJS.Timeout | null = null;
    private isSyncing = false;
    private wasOffline = false;

    startAutoSync(userId: string) {
        this.stopAutoSync();
        console.log(`[SynchronizationService] Starting auto-sync for user ${userId}`);

        // Cleanup old deletion logs on app launch (30+ days old)
        void this.cleanupOldDeletionLogs(userId);

        // Initial sync
        void this.syncAll(userId);

        // Poll for connection status
        this.syncInterval = setInterval(async () => {
            const isOnline = await this.checkConnection();

            if (isOnline) {
                if (this.wasOffline) {
                    console.log("[SynchronizationService] Connection restored. Running re-connection sync.");
                    await this.syncAll(userId);
                    this.wasOffline = false;
                }
            } else {
                this.wasOffline = true;
            }
        }, 30000);
    }

    stopAutoSync() {
        if (this.syncInterval) {
            console.log("[SynchronizationService] Stopping auto-sync");
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }

    private async checkConnection(): Promise<boolean> {
        try {
            const { error } = await SupabaseService.getClient()
                .from("projects")
                .select("id", { count: "exact", head: true })
                .limit(1);
            return !error;
        } catch {
            return false;
        }
    }

    /**
     * Clean up deletion logs older than 30 days from both local and remote storage.
     */
    private async cleanupOldDeletionLogs(userId: string): Promise<void> {
        try {
            const [localRemoved, remoteRemoved] = await Promise.all([
                deletionLog.cleanupOldEntries(30),
                this.supabaseDeletionLogRepo.cleanupOldEntries(userId, 30),
            ]);

            if (localRemoved > 0 || remoteRemoved > 0) {
                console.log(
                    `[SynchronizationService] Deletion log cleanup: ${localRemoved} local, ${remoteRemoved} remote entries removed`
                );
            }
        } catch (error) {
            console.error("[SynchronizationService] Failed to cleanup old deletion logs", error);
        }
    }

    async syncAll(userId: string) {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            // Process pending deletions first
            await this.processDeletionLog(userId);

            // Sync projects
            const remoteProjects = await this.supabaseProjectRepo.findAllByUserId(userId);
            const localProjects = await this.fsProjectRepo.findAllByUserId(userId);
            const localProjectMap = new Map(localProjects.map((p) => [p.id, p]));

            for (const remoteP of remoteProjects) {
                const localP = localProjectMap.get(remoteP.id);
                if (localP) {
                    // Most recent wins
                    if (remoteP.updatedAt > localP.updatedAt) {
                        await this.fsProjectRepo.update(remoteP);
                    } else if (localP.updatedAt > remoteP.updatedAt) {
                        await this.supabaseProjectRepo.update(localP);
                    }
                } else {
                    // Remote-only project, save locally
                    await this.fsProjectRepo.create(userId, remoteP);
                }

                await this.syncProjectChildren(remoteP.id);
            }

            // Upload local-only projects
            for (const localP of localProjects) {
                if (!remoteProjects.find((p) => p.id === localP.id)) {
                    await this.supabaseProjectRepo.create(userId, localP);
                    await this.syncProjectChildren(localP.id);
                }
            }

            console.log("[SynchronizationService] Sync complete");
        } catch (error) {
            console.error("[SynchronizationService] Sync failed:", error);
        } finally {
            this.isSyncing = false;
        }
    }

    private async syncProjectChildren(projectId: string) {
        await this.syncChapters(projectId);
        await this.syncCharacters(projectId);
        await this.syncLocations(projectId);
        await this.syncOrganizations(projectId);
        await this.syncScrapNotes(projectId);
        await this.syncAssets(projectId);
    }

    // ========================================================================
    // ENTITY SYNC METHODS - All use "most recent wins" strategy
    // ========================================================================

    private async syncChapters(projectId: string) {
        const remote = await this.supabaseChapterRepo.findByProjectId(projectId);
        const local = await this.fsChapterRepo.findByProjectId(projectId);
        const localMap = new Map(local.map((c) => [c.id, c]));
        const remoteMap = new Map(remote.map((c) => [c.id, c]));

        // Sync remote -> local
        for (const remoteC of remote) {
            if (await deletionLog.isDeleted(remoteC.id)) continue;

            const localC = localMap.get(remoteC.id);
            if (localC) {
                if (remoteC.updatedAt > localC.updatedAt) {
                    await this.fsChapterRepo.update(remoteC);
                } else if (localC.updatedAt > remoteC.updatedAt) {
                    await this.supabaseChapterRepo.update(localC);
                }
            } else {
                await this.fsChapterRepo.create(projectId, remoteC);
            }
        }

        // Sync local -> remote (local-only items)
        for (const localC of local) {
            if (!remoteMap.has(localC.id)) {
                await this.supabaseChapterRepo.create(projectId, localC);
            }
        }
    }

    private async syncCharacters(projectId: string) {
        const remote = await this.supabaseCharacterRepo.findByProjectId(projectId);
        const local = await this.fsCharacterRepo.findByProjectId(projectId);
        const localMap = new Map(local.map((c) => [c.id, c]));
        const remoteMap = new Map(remote.map((c) => [c.id, c]));

        for (const remoteC of remote) {
            if (await deletionLog.isDeleted(remoteC.id)) continue;

            const localC = localMap.get(remoteC.id);
            if (localC) {
                if (remoteC.updatedAt > localC.updatedAt) {
                    await this.fsCharacterRepo.update(remoteC);
                } else if (localC.updatedAt > remoteC.updatedAt) {
                    await this.supabaseCharacterRepo.update(localC);
                }
            } else {
                await this.fsCharacterRepo.create(projectId, remoteC);
            }
        }

        for (const localC of local) {
            if (!remoteMap.has(localC.id)) {
                await this.supabaseCharacterRepo.create(projectId, localC);
            }
        }
    }

    private async syncLocations(projectId: string) {
        const remote = await this.supabaseLocationRepo.findByProjectId(projectId);
        const local = await this.fsLocationRepo.findByProjectId(projectId);
        const localMap = new Map(local.map((l) => [l.id, l]));
        const remoteMap = new Map(remote.map((l) => [l.id, l]));

        for (const remoteL of remote) {
            if (await deletionLog.isDeleted(remoteL.id)) continue;

            const localL = localMap.get(remoteL.id);
            if (localL) {
                if (remoteL.updatedAt > localL.updatedAt) {
                    await this.fsLocationRepo.update(remoteL);
                } else if (localL.updatedAt > remoteL.updatedAt) {
                    await this.supabaseLocationRepo.update(localL);
                }
            } else {
                await this.fsLocationRepo.create(projectId, remoteL);
            }
        }

        for (const localL of local) {
            if (!remoteMap.has(localL.id)) {
                await this.supabaseLocationRepo.create(projectId, localL);
            }
        }
    }

    private async syncOrganizations(projectId: string) {
        const remote = await this.supabaseOrganizationRepo.findByProjectId(projectId);
        const local = await this.fsOrganizationRepo.findByProjectId(projectId);
        const localMap = new Map(local.map((o) => [o.id, o]));
        const remoteMap = new Map(remote.map((o) => [o.id, o]));

        for (const remoteO of remote) {
            if (await deletionLog.isDeleted(remoteO.id)) continue;

            const localO = localMap.get(remoteO.id);
            if (localO) {
                if (remoteO.updatedAt > localO.updatedAt) {
                    await this.fsOrganizationRepo.update(remoteO);
                } else if (localO.updatedAt > remoteO.updatedAt) {
                    await this.supabaseOrganizationRepo.update(localO);
                }
            } else {
                await this.fsOrganizationRepo.create(projectId, remoteO);
            }
        }

        for (const localO of local) {
            if (!remoteMap.has(localO.id)) {
                await this.supabaseOrganizationRepo.create(projectId, localO);
            }
        }
    }

    private async syncScrapNotes(projectId: string) {
        const remote = await this.supabaseScrapNoteRepo.findByProjectId(projectId);
        const local = await this.fsScrapNoteRepo.findByProjectId(projectId);
        const localMap = new Map(local.map((n) => [n.id, n]));
        const remoteMap = new Map(remote.map((n) => [n.id, n]));

        for (const remoteN of remote) {
            if (await deletionLog.isDeleted(remoteN.id)) continue;

            const localN = localMap.get(remoteN.id);
            if (localN) {
                if (remoteN.updatedAt > localN.updatedAt) {
                    await this.fsScrapNoteRepo.update(remoteN);
                } else if (localN.updatedAt > remoteN.updatedAt) {
                    await this.supabaseScrapNoteRepo.update(localN);
                }
            } else {
                await this.fsScrapNoteRepo.create(projectId, remoteN);
            }
        }

        for (const localN of local) {
            if (!remoteMap.has(localN.id)) {
                await this.supabaseScrapNoteRepo.create(projectId, localN);
            }
        }
    }

    private async syncAssets(projectId: string) {
        await this.syncImages(projectId);
        await this.syncBGMs(projectId);
        await this.syncPlaylists(projectId);
    }

    private async syncImages(projectId: string) {
        const remote = await this.supabaseAssetRepo.findImagesByProjectId(projectId);
        const local = await this.fsAssetRepo.findImagesByProjectId(projectId);
        const localMap = new Map(local.map((i) => [i.id, i]));
        const remoteMap = new Map(remote.map((i) => [i.id, i]));

        for (const remoteImg of remote) {
            if (await deletionLog.isDeleted(remoteImg.id)) continue;

            const localImg = localMap.get(remoteImg.id);
            if (!localImg || remoteImg.updatedAt > localImg.updatedAt) {
                await this.downloadAsset(remoteImg.storagePath);
                await this.fsAssetRepo.saveImage(projectId, remoteImg);
            }
        }

        for (const localImg of local) {
            if (!remoteMap.has(localImg.id)) {
                await this.uploadAsset(localImg.storagePath);
                await this.supabaseAssetRepo.saveImage(projectId, localImg);
            }
        }
    }

    private async syncBGMs(projectId: string) {
        const remote = await this.supabaseAssetRepo.findBGMByProjectId(projectId);
        const local = await this.fsAssetRepo.findBGMByProjectId(projectId);
        const localMap = new Map(local.map((b) => [b.id, b]));
        const remoteMap = new Map(remote.map((b) => [b.id, b]));

        for (const remoteBGM of remote) {
            if (await deletionLog.isDeleted(remoteBGM.id)) continue;

            const localBGM = localMap.get(remoteBGM.id);
            if (!localBGM || remoteBGM.updatedAt > localBGM.updatedAt) {
                await this.downloadAsset(remoteBGM.storagePath);
                await this.fsAssetRepo.saveBGM(projectId, remoteBGM);
            }
        }

        for (const localBGM of local) {
            if (!remoteMap.has(localBGM.id)) {
                await this.uploadAsset(localBGM.storagePath);
                await this.supabaseAssetRepo.saveBGM(projectId, localBGM);
            }
        }
    }

    private async syncPlaylists(projectId: string) {
        const remote = await this.supabaseAssetRepo.findPlaylistsByProjectId(projectId);
        const local = await this.fsAssetRepo.findPlaylistsByProjectId(projectId);
        const localMap = new Map(local.map((p) => [p.id, p]));
        const remoteMap = new Map(remote.map((p) => [p.id, p]));

        for (const remotePlaylist of remote) {
            if (await deletionLog.isDeleted(remotePlaylist.id)) continue;

            const localPlaylist = localMap.get(remotePlaylist.id);
            if (!localPlaylist || remotePlaylist.updatedAt > localPlaylist.updatedAt) {
                if (remotePlaylist.storagePath) {
                    await this.downloadAsset(remotePlaylist.storagePath);
                }
                await this.fsAssetRepo.savePlaylist(projectId, remotePlaylist);
            }
        }

        for (const localPlaylist of local) {
            if (!remoteMap.has(localPlaylist.id)) {
                if (localPlaylist.storagePath) {
                    await this.uploadAsset(localPlaylist.storagePath);
                }
                await this.supabaseAssetRepo.savePlaylist(projectId, localPlaylist);
            }
        }
    }

    // ========================================================================
    // DELETION LOG PROCESSING
    // ========================================================================

    private async processDeletionLog(userId: string) {
        // 1. Process Local Deletions (Push to Remote)
        const log = await deletionLog.getAll();
        for (const item of log) {
            try {
                const remoteTimestamp = await this.getRemoteUpdatedAt(item.entityType, item.entityId);

                // If remote was updated after local deletion, skip the deletion (remote wins)
                if (remoteTimestamp && remoteTimestamp.getTime() > item.timestamp) {
                    console.log(`[SynchronizationService] Skipping deletion of ${item.entityId}: remote is newer`);
                    await deletionLog.remove(item.entityId);
                    continue;
                }

                // Perform remote deletion
                await this.deleteRemoteEntity(item.entityType, item.entityId);

                // Create remote deletion log entry for other devices
                await this.supabaseDeletionLogRepo.create(
                    item.entityId,
                    item.entityType,
                    item.projectId,
                    userId
                );

                await deletionLog.remove(item.entityId);
            } catch (error) {
                console.warn("[SynchronizationService] Failed to process pending deletion", item, error);
            }
        }

        // 2. Process Remote Deletions (Pull to Local)
        const remoteDeletions = await this.supabaseDeletionLogRepo.findAllByUserId(userId);
        for (const deletion of remoteDeletions) {
            try {
                const deletedAt = new Date(deletion.deleted_at).getTime();
                const localUpdatedAt = await this.getLocalUpdatedAt(
                    deletion.entity_type as EntityType,
                    deletion.entity_id
                );

                if (localUpdatedAt) {
                    if (localUpdatedAt.getTime() > deletedAt) {
                        // Local is newer - resurrect by re-uploading (handled by normal sync)
                        console.log(`[SynchronizationService] Resurrecting ${deletion.entity_id}: local is newer`);
                        await this.supabaseDeletionLogRepo.delete(deletion.id);
                    } else {
                        // Remote deletion is newer - delete locally
                        await this.deleteLocalEntity(deletion.entity_type as EntityType, deletion.entity_id);
                    }
                }
            } catch (error) {
                console.warn("[SynchronizationService] Failed to process remote deletion", deletion, error);
            }
        }
    }

    private async getRemoteUpdatedAt(type: EntityType, id: string): Promise<Date | null> {
        try {
            let entity: { updatedAt: Date } | null = null;

            switch (type) {
                case "chapter":
                    entity = await this.supabaseChapterRepo.findById(id);
                    break;
                case "character":
                    entity = await this.supabaseCharacterRepo.findById(id);
                    break;
                case "location":
                    entity = await this.supabaseLocationRepo.findById(id);
                    break;
                case "organization":
                    entity = await this.supabaseOrganizationRepo.findById(id);
                    break;
                case "scrapNote":
                    entity = await this.supabaseScrapNoteRepo.findById(id);
                    break;
                case "image":
                    entity = await this.supabaseAssetRepo.findImageById(id);
                    break;
                case "bgm":
                    entity = await this.supabaseAssetRepo.findBGMById(id);
                    break;
                case "playlist":
                    entity = await this.supabaseAssetRepo.findPlaylistById(id);
                    break;
            }

            return entity?.updatedAt ?? null;
        } catch {
            return null;
        }
    }

    private async getLocalUpdatedAt(type: EntityType, id: string): Promise<Date | null> {
        try {
            let entity: { updatedAt: Date } | null = null;

            switch (type) {
                case "chapter":
                    entity = await this.fsChapterRepo.findById(id);
                    break;
                case "character":
                    entity = await this.fsCharacterRepo.findById(id);
                    break;
                case "location":
                    entity = await this.fsLocationRepo.findById(id);
                    break;
                case "organization":
                    entity = await this.fsOrganizationRepo.findById(id);
                    break;
                case "scrapNote":
                    entity = await this.fsScrapNoteRepo.findById(id);
                    break;
                case "image":
                    entity = await this.fsAssetRepo.findImageById(id);
                    break;
                case "bgm":
                    entity = await this.fsAssetRepo.findBGMById(id);
                    break;
                case "playlist":
                    entity = await this.fsAssetRepo.findPlaylistById(id);
                    break;
            }

            return entity?.updatedAt ?? null;
        } catch {
            return null;
        }
    }

    private async deleteRemoteEntity(type: EntityType, id: string): Promise<void> {
        switch (type) {
            case "chapter":
                await this.supabaseChapterRepo.delete(id);
                break;
            case "character":
                await this.supabaseCharacterRepo.delete(id);
                break;
            case "location":
                await this.supabaseLocationRepo.delete(id);
                break;
            case "organization":
                await this.supabaseOrganizationRepo.delete(id);
                break;
            case "scrapNote":
                await this.supabaseScrapNoteRepo.delete(id);
                break;
            case "image":
                await this.supabaseAssetRepo.deleteImage(id);
                break;
            case "bgm":
                await this.supabaseAssetRepo.deleteBGM(id);
                break;
            case "playlist":
                await this.supabaseAssetRepo.deletePlaylist(id);
                break;
        }
    }

    private async deleteLocalEntity(type: EntityType, id: string): Promise<void> {
        switch (type) {
            case "chapter":
                await this.fsChapterRepo.delete(id);
                break;
            case "character":
                await this.fsCharacterRepo.delete(id);
                break;
            case "location":
                await this.fsLocationRepo.delete(id);
                break;
            case "organization":
                await this.fsOrganizationRepo.delete(id);
                break;
            case "scrapNote":
                await this.fsScrapNoteRepo.delete(id);
                break;
            case "image":
                await this.fsAssetRepo.deleteImage(id);
                break;
            case "bgm":
                await this.fsAssetRepo.deleteBGM(id);
                break;
            case "playlist":
                await this.fsAssetRepo.deletePlaylist(id);
                break;
        }
    }

    // ========================================================================
    // ASSET FILE SYNC
    // ========================================================================

    private async uploadAsset(storagePath: string): Promise<void> {
        if (!storagePath) return;

        const localPath = path.join("assets", storagePath);
        if (!(await fileSystemService.exists(localPath))) return;

        const buffer = await fileSystemService.readBuffer(localPath);
        if (!buffer) return;

        const client = SupabaseService.getClient();
        await client.storage
            .from("inkline-assets")
            .upload(storagePath, buffer, { upsert: true });
    }

    private async downloadAsset(storagePath: string): Promise<void> {
        if (!storagePath) return;

        const localPath = path.join("assets", storagePath);
        const client = SupabaseService.getClient();

        const { data, error } = await client.storage
            .from("inkline-assets")
            .download(storagePath);

        if (!error && data) {
            const buffer = await data.arrayBuffer();
            await fileSystemService.writeFile(localPath, Buffer.from(buffer));
        }
    }
}
