import { EventEmitter } from "events";
import {
    RealtimeChannel,
    RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
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
import {
    SyncStateGateway,
    RemoteChangePayload,
    EntityType as SyncEntityType,
} from "../../@interface-adapters/controllers/sync/SyncStateGateway";

/**
 * Queued realtime event to be processed after a sync operation completes.
 */
type QueuedRealtimeEvent = {
    entityType: SyncEntityType;
    entityId: string;
    projectId: string;
    eventType: "INSERT" | "UPDATE" | "DELETE";
    timestamp: number;
};

/**
 * SynchronizationService handles bidirectional sync between local filesystem and Supabase.
 *
 * Architecture: Incremental Sync with Event Queuing
 * - Realtime subscriptions push granular entity updates to the renderer
 * - Events received during full sync are queued and replayed afterward
 * - Automatic reconnection with exponential backoff on channel failure
 *
 * Conflict Resolution Strategy: "Most Recent Wins"
 * - When syncing, the entity with the most recent updatedAt timestamp is used as the source of truth.
 * - If user has local changes newer than remote, a conflict dialog is shown
 *
 * Deletion Handling:
 * - Deletions are tracked in a local deletion log when offline.
 * - On sync, if the remote entity was updated AFTER the deletion timestamp, the deletion is cancelled
 *   and the remote version is restored locally.
 * - Remote deletion logs allow other devices to sync deletions.
 */
export class SynchronizationService extends EventEmitter {
    private syncStateGateway: SyncStateGateway | null = null;

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

    setSyncStateGateway(gateway: SyncStateGateway): void {
        this.syncStateGateway = gateway;
    }

    private syncInterval: NodeJS.Timeout | null = null;
    private realtimeChannel: RealtimeChannel | null = null;
    private isSyncing = false;
    private wasOffline = false;
    private currentUserId: string | null = null;
    private isOnline = false;

    // Event queue for realtime events received during sync
    private eventQueue: QueuedRealtimeEvent[] = [];
    private isProcessingQueue = false;

    // Reconnection state
    private reconnectAttempts = 0;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private readonly maxReconnectAttempts = 10;
    private readonly baseReconnectDelay = 1000; // 1 second

    // Cache of user's project IDs for filtering (populated during sync)
    private userProjectIds: Set<string> = new Set();

    startAutoSync(userId: string) {
        this.stopAutoSync();
        this.currentUserId = userId;
        this.reconnectAttempts = 0;
        console.log(
            `[SynchronizationService] Starting auto-sync for user ${userId}`
        );

        // Cleanup old deletion logs on app launch (30+ days old)
        void this.cleanupOldDeletionLogs(userId);

        // Initial sync - this also populates userProjectIds
        void this.syncAll(userId);

        // Set up Supabase Realtime subscriptions for all entity tables
        this.setupRealtimeSubscriptions(userId);

        // Immediate connection check
        this.checkConnection(userId).then((online) => {
            console.log(
                `[SynchronizationService] Initial connection check: ${
                    online ? "Online" : "Offline"
                }`
            );
            this.isOnline = online;
            this.syncStateGateway?.setStatus(online ? "online" : "offline");
        });

        // Poll for connection status (every 30 seconds)
        this.syncInterval = setInterval(async () => {
            const online = await this.checkConnection(userId);

            if (online !== this.isOnline) {
                this.isOnline = online;
                this.syncStateGateway?.setStatus(online ? "online" : "offline");
            }

            if (online) {
                if (this.wasOffline) {
                    console.log(
                        "[SynchronizationService] Connection restored. Running re-connection sync."
                    );
                    await this.syncAll(userId);
                    this.wasOffline = false;
                }
            } else {
                this.wasOffline = true;
            }
        }, 30000);
    }

    stopAutoSync() {
        this.currentUserId = null;
        this.userProjectIds.clear();
        this.eventQueue = [];

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.syncInterval) {
            console.log("[SynchronizationService] Stopping auto-sync");
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        // Unsubscribe from realtime channel
        if (this.realtimeChannel) {
            console.log("[SynchronizationService] Unsubscribing from realtime");
            SupabaseService.getClient().removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }

        this.isOnline = false;
        this.syncStateGateway?.setStatus("offline");
    }

    private setupRealtimeSubscriptions(userId: string): void {
        // Clean up existing channel if any
        if (this.realtimeChannel) {
            SupabaseService.getClient().removeChannel(this.realtimeChannel);
            this.realtimeChannel = null;
        }

        const client = SupabaseService.getClient();

        // Create a single channel that listens to all relevant tables
        // Note: Child entity tables (chapters, characters, etc.) don't have user_id filters
        // because Supabase Realtime doesn't support joins. We filter client-side using userProjectIds.
        this.realtimeChannel = client
            .channel(`sync-${userId}-${Date.now()}`) // Unique channel name for reconnection
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "projects",
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => this.handleRealtimeChange("project", payload)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "chapters" },
                (payload) => this.handleRealtimeChange("chapter", payload)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "characters" },
                (payload) => this.handleRealtimeChange("character", payload)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "locations" },
                (payload) => this.handleRealtimeChange("location", payload)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "organizations" },
                (payload) => this.handleRealtimeChange("organization", payload)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "scrap_notes" },
                (payload) => this.handleRealtimeChange("scrapNote", payload)
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "assets" },
                (payload) => this.handleAssetRealtimeChange(payload)
            )
            .subscribe(async (status) => {
                console.log(
                    `[SynchronizationService] Realtime subscription status: ${status}`
                );
                if (status === "SUBSCRIBED") {
                    this.isOnline = true;
                    this.reconnectAttempts = 0; // Reset on successful connection
                    this.syncStateGateway?.setStatus("online");

                    // Cancel any pending reconnection attempts since we're now connected
                    if (this.reconnectTimeout) {
                        clearTimeout(this.reconnectTimeout);
                        this.reconnectTimeout = null;
                    }
                } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
                    this.isOnline = false;
                    this.syncStateGateway?.setStatus("offline");
                    this.scheduleReconnect(userId);
                }
            });
    }

    /**
     * Schedule a reconnection attempt with exponential backoff.
     */
    private scheduleReconnect(userId: string): void {
        if (!this.currentUserId || this.currentUserId !== userId) {
            return; // User logged out or changed
        }

        // Don't schedule if we already have a pending reconnection
        if (this.reconnectTimeout) {
            return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error(
                "[SynchronizationService] Max reconnection attempts reached. Manual refresh required."
            );
            return;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (capped)
        const delay = Math.min(
            this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
            60000
        );
        this.reconnectAttempts++;

        console.log(
            `[SynchronizationService] Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`
        );

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null; // Clear the reference before attempting reconnection
            if (this.currentUserId === userId) {
                console.log(
                    `[SynchronizationService] Attempting reconnection...`
                );
                this.setupRealtimeSubscriptions(userId);
            }
        }, delay);
    }

    // Type for Supabase realtime payload records
    private extractRecordFields(record: Record<string, unknown>): {
        projectId: string;
        entityId: string;
        updatedAt: string;
        assetType?: string;
    } {
        return {
            projectId:
                (record.project_id as string) || (record.id as string) || "",
            entityId: (record.id as string) || "",
            updatedAt:
                (record.updated_at as string) || new Date().toISOString(),
            assetType: record.type as string | undefined,
        };
    }

    private handleRealtimeChange(
        entityType: SyncEntityType,
        payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ): void {
        const record = (payload.new || payload.old) as
            | Record<string, unknown>
            | undefined;
        if (!record) return;

        const { projectId, entityId, updatedAt } =
            this.extractRecordFields(record);

        // Filter out changes for projects we don't own (security filter)
        // Projects table is already filtered by user_id in the subscription,
        // but child entities need client-side filtering
        if (entityType !== "project" && !this.userProjectIds.has(projectId)) {
            // If the cache isn't ready yet (startup / initial sync), don't drop events.
            if (this.userProjectIds.size === 0) {
                this.eventQueue.push({
                    entityType,
                    entityId,
                    projectId,
                    eventType: payload.eventType as
                        | "INSERT"
                        | "UPDATE"
                        | "DELETE",
                    timestamp: Date.now(),
                });
                return;
            }

            // This change is for another user's project - ignore it
            return;
        }

        // For INSERT on projects, add to our project IDs set
        if (entityType === "project" && payload.eventType === "INSERT") {
            this.userProjectIds.add(entityId);
        }

        const changePayload: RemoteChangePayload = {
            entityType,
            entityId,
            projectId,
            changeType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
            updatedAt,
        };

        console.log(
            `[SynchronizationService] Realtime change: ${entityType} ${payload.eventType}`,
            entityId
        );

        // Emit event for the UI to handle
        this.emit("remote-change", changePayload);
        this.syncStateGateway?.notifyRemoteChange(changePayload);

        // If we're currently syncing, queue the event for later processing
        if (this.isSyncing) {
            this.eventQueue.push({
                entityType,
                entityId,
                projectId,
                eventType: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
                timestamp: Date.now(),
            });
            console.log(
                `[SynchronizationService] Queued event during sync: ${entityType} ${payload.eventType}`
            );
            return;
        }

        // Process the change immediately
        if (this.currentUserId) {
            void this.handleRemoteEntityChange(
                entityType,
                entityId,
                projectId,
                payload.eventType
            );
        }
    }

    private handleAssetRealtimeChange(
        payload: RealtimePostgresChangesPayload<Record<string, unknown>>
    ): void {
        const record = (payload.new || payload.old) as
            | Record<string, unknown>
            | undefined;
        if (!record) return;

        const { assetType } = this.extractRecordFields(record);
        if (!assetType) return;

        let entityType: SyncEntityType;

        switch (assetType) {
            case "image":
                entityType = "image";
                break;
            case "bgm":
                entityType = "bgm";
                break;
            case "playlist":
                entityType = "playlist";
                break;
            default:
                return; // Unknown asset type
        }

        this.handleRealtimeChange(entityType, payload);
    }

    private async handleRemoteEntityChange(
        entityType: SyncEntityType,
        entityId: string,
        projectId: string,
        eventType: string
    ): Promise<void> {
        // Handle project entity changes - sync and notify
        if (entityType === "project") {
            if (eventType === "DELETE") {
                // Project deleted remotely - notify renderer
                this.syncStateGateway?.notifyEntityDeleted({
                    entityType,
                    entityId,
                    projectId: entityId, // For projects, projectId = entityId
                });
                return;
            }

            // For INSERT/UPDATE on projects, sync and notify
            try {
                const remoteProject =
                    await this.supabaseProjectRepo.findById(entityId);
                if (remoteProject) {
                    await this.fsProjectRepo.update(remoteProject);
                    this.syncStateGateway?.notifyEntityUpdated({
                        entityType,
                        entityId,
                        projectId: entityId,
                        data: remoteProject,
                    });
                }
            } catch (error) {
                console.error(
                    `[SynchronizationService] Failed to sync project ${entityId}`,
                    error
                );
            }
            return;
        }

        if (eventType === "DELETE") {
            // Remote deletion - delete locally and notify renderer
            await this.deleteLocalEntity(entityType as EntityType, entityId);
            this.syncStateGateway?.notifyEntityDeleted({
                entityType,
                entityId,
                projectId,
            });
            return;
        }

        // For INSERT or UPDATE, sync the entity
        try {
            const remoteUpdatedAt = await this.getRemoteUpdatedAt(
                entityType as EntityType,
                entityId
            );
            const localUpdatedAt = await this.getLocalUpdatedAt(
                entityType as EntityType,
                entityId
            );

            if (!remoteUpdatedAt) return;

            // If no local version or remote is newer, update local and notify
            if (!localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
                const entity = await this.syncSingleEntityAndReturn(
                    entityType as EntityType,
                    entityId,
                    projectId
                );
                if (entity) {
                    this.syncStateGateway?.notifyEntityUpdated({
                        entityType,
                        entityId,
                        projectId,
                        data: entity,
                    });
                }
            } else if (localUpdatedAt > remoteUpdatedAt) {
                // Local is newer - this is a conflict scenario
                // The user on this device made changes while another device pushed to DB
                // We notify the user via the gateway
                const entityName = await this.getEntityName(
                    entityType as EntityType,
                    entityId
                );
                this.syncStateGateway?.notifyConflict({
                    entityType,
                    entityId,
                    projectId,
                    entityName: entityName || entityId,
                    localUpdatedAt: localUpdatedAt.toISOString(),
                    remoteUpdatedAt: remoteUpdatedAt.toISOString(),
                });
            }
        } catch (error) {
            console.error(
                `[SynchronizationService] Failed to handle remote change for ${entityType}:${entityId}`,
                error
            );
        }
    }

    private async getEntityName(
        type: EntityType | "project",
        id: string
    ): Promise<string | null> {
        try {
            switch (type) {
                case "project": {
                    const project = await this.fsProjectRepo.findById(id);
                    return project?.title ?? null;
                }
                case "chapter": {
                    const chapter = await this.fsChapterRepo.findById(id);
                    return chapter?.title ?? null;
                }
                case "character": {
                    const character = await this.fsCharacterRepo.findById(id);
                    return character?.name ?? null;
                }
                case "location": {
                    const location = await this.fsLocationRepo.findById(id);
                    return location?.name ?? null;
                }
                case "organization": {
                    const organization =
                        await this.fsOrganizationRepo.findById(id);
                    return organization?.name ?? null;
                }
                case "scrapNote": {
                    const scrapNote = await this.fsScrapNoteRepo.findById(id);
                    return scrapNote?.title ?? null;
                }
                default:
                    return null;
            }
        } catch {
            return null;
        }
    }

    /**
     * Sync a single entity from remote to local and return the synced entity.
     * Used for incremental updates to notify the renderer with fresh data.
     */
    private async syncSingleEntityAndReturn(
        type: EntityType,
        id: string,
        projectId: string
    ): Promise<unknown | null> {
        switch (type) {
            case "chapter": {
                const chapter = await this.supabaseChapterRepo.findById(id);
                if (chapter) {
                    await this.fsChapterRepo.update(chapter);
                    return chapter;
                }
                return null;
            }
            case "character": {
                const character = await this.supabaseCharacterRepo.findById(id);
                if (character) {
                    await this.fsCharacterRepo.update(character);
                    return character;
                }
                return null;
            }
            case "location": {
                const location = await this.supabaseLocationRepo.findById(id);
                if (location) {
                    await this.fsLocationRepo.update(location);
                    return location;
                }
                return null;
            }
            case "organization": {
                const organization =
                    await this.supabaseOrganizationRepo.findById(id);
                if (organization) {
                    await this.fsOrganizationRepo.update(organization);
                    return organization;
                }
                return null;
            }
            case "scrapNote": {
                const scrapNote = await this.supabaseScrapNoteRepo.findById(id);
                if (scrapNote) {
                    await this.fsScrapNoteRepo.update(scrapNote);
                    return scrapNote;
                }
                return null;
            }
            case "image": {
                const image = await this.supabaseAssetRepo.findImageById(id);
                if (image) {
                    await this.downloadAsset(image.storagePath);
                    await this.fsAssetRepo.saveImage(projectId, image);
                    return image;
                }
                return null;
            }
            case "bgm": {
                const bgm = await this.supabaseAssetRepo.findBGMById(id);
                if (bgm) {
                    await this.downloadAsset(bgm.storagePath);
                    await this.fsAssetRepo.saveBGM(projectId, bgm);
                    return bgm;
                }
                return null;
            }
            case "playlist": {
                const playlist =
                    await this.supabaseAssetRepo.findPlaylistById(id);
                if (playlist) {
                    if (playlist.storagePath)
                        await this.downloadAsset(playlist.storagePath);
                    await this.fsAssetRepo.savePlaylist(projectId, playlist);
                    return playlist;
                }
                return null;
            }
            default:
                return null;
        }
    }

    private async syncSingleEntity(
        type: EntityType,
        id: string,
        projectId: string
    ): Promise<void> {
        switch (type) {
            case "chapter": {
                const chapter = await this.supabaseChapterRepo.findById(id);
                if (chapter) await this.fsChapterRepo.update(chapter);
                break;
            }
            case "character": {
                const character = await this.supabaseCharacterRepo.findById(id);
                if (character) await this.fsCharacterRepo.update(character);
                break;
            }
            case "location": {
                const location = await this.supabaseLocationRepo.findById(id);
                if (location) await this.fsLocationRepo.update(location);
                break;
            }
            case "organization": {
                const organization =
                    await this.supabaseOrganizationRepo.findById(id);
                if (organization)
                    await this.fsOrganizationRepo.update(organization);
                break;
            }
            case "scrapNote": {
                const scrapNote = await this.supabaseScrapNoteRepo.findById(id);
                if (scrapNote) await this.fsScrapNoteRepo.update(scrapNote);
                break;
            }
            case "image": {
                const image = await this.supabaseAssetRepo.findImageById(id);
                if (image) {
                    await this.downloadAsset(image.storagePath);
                    await this.fsAssetRepo.saveImage(projectId, image);
                }
                break;
            }
            case "bgm": {
                const bgm = await this.supabaseAssetRepo.findBGMById(id);
                if (bgm) {
                    await this.downloadAsset(bgm.storagePath);
                    await this.fsAssetRepo.saveBGM(projectId, bgm);
                }
                break;
            }
            case "playlist": {
                const playlist =
                    await this.supabaseAssetRepo.findPlaylistById(id);
                if (playlist) {
                    if (playlist.storagePath)
                        await this.downloadAsset(playlist.storagePath);
                    await this.fsAssetRepo.savePlaylist(projectId, playlist);
                }
                break;
            }
        }
    }

    /**
     * Called by renderer when user resolves a conflict.
     * Returns the resolved entity data so the UI can update.
     */
    async resolveConflict(
        entityType: EntityType,
        entityId: string,
        projectId: string,
        resolution: "accept-remote" | "keep-local"
    ): Promise<void> {
        let entity: unknown = null;

        if (resolution === "accept-remote") {
            entity = await this.syncSingleEntityAndReturn(
                entityType,
                entityId,
                projectId
            );
        } else {
            // keep-local: push local version to remote
            entity = await this.pushLocalToRemoteAndReturn(
                entityType,
                entityId,
                projectId
            );
        }

        // Notify the renderer with the resolved entity
        if (entity) {
            this.syncStateGateway?.notifyEntityUpdated({
                entityType: entityType as SyncEntityType,
                entityId,
                projectId,
                data: entity,
            });
        }
    }

    /**
     * Push local entity to remote and return the entity.
     */
    private async pushLocalToRemoteAndReturn(
        type: EntityType,
        id: string,
        projectId: string
    ): Promise<unknown | null> {
        switch (type) {
            case "chapter": {
                const chapter = await this.fsChapterRepo.findById(id);
                if (chapter) {
                    await this.supabaseChapterRepo.update(chapter);
                    return chapter;
                }
                return null;
            }
            case "character": {
                const character = await this.fsCharacterRepo.findById(id);
                if (character) {
                    await this.supabaseCharacterRepo.update(character);
                    return character;
                }
                return null;
            }
            case "location": {
                const location = await this.fsLocationRepo.findById(id);
                if (location) {
                    await this.supabaseLocationRepo.update(location);
                    return location;
                }
                return null;
            }
            case "organization": {
                const organization = await this.fsOrganizationRepo.findById(id);
                if (organization) {
                    await this.supabaseOrganizationRepo.update(organization);
                    return organization;
                }
                return null;
            }
            case "scrapNote": {
                const scrapNote = await this.fsScrapNoteRepo.findById(id);
                if (scrapNote) {
                    await this.supabaseScrapNoteRepo.update(scrapNote);
                    return scrapNote;
                }
                return null;
            }
            case "image": {
                const image = await this.fsAssetRepo.findImageById(id);
                if (image) {
                    await this.uploadAsset(image.storagePath);
                    await this.supabaseAssetRepo.saveImage(projectId, image);
                    return image;
                }
                return null;
            }
            case "bgm": {
                const bgm = await this.fsAssetRepo.findBGMById(id);
                if (bgm) {
                    await this.uploadAsset(bgm.storagePath);
                    await this.supabaseAssetRepo.saveBGM(projectId, bgm);
                    return bgm;
                }
                return null;
            }
            case "playlist": {
                const playlist = await this.fsAssetRepo.findPlaylistById(id);
                if (playlist) {
                    if (playlist.storagePath)
                        await this.uploadAsset(playlist.storagePath);
                    await this.supabaseAssetRepo.savePlaylist(
                        projectId,
                        playlist
                    );
                    return playlist;
                }
                return null;
            }
            default:
                return null;
        }
    }

    private async checkConnection(userId: string): Promise<boolean> {
        try {
            const { error } = await SupabaseService.getClient()
                .from("projects")
                .select("id", { count: "exact", head: true })
                .eq("user_id", userId)
                .limit(1);

            if (error) {
                console.error(
                    "[SynchronizationService] Connection check failed:",
                    error
                );
                return false;
            }
            return true;
        } catch (error) {
            console.error(
                "[SynchronizationService] Connection check exception:",
                error
            );
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
            console.error(
                "[SynchronizationService] Failed to cleanup old deletion logs",
                error
            );
        }
    }

    async syncAll(userId: string) {
        if (this.isSyncing) return;
        this.isSyncing = true;
        this.syncStateGateway?.setStatus("syncing");

        try {
            // Process pending deletions first
            await this.processDeletionLog(userId);

            // Sync projects and populate userProjectIds cache
            const remoteProjects =
                await this.supabaseProjectRepo.findAllByUserId(userId);
            const localProjects =
                await this.fsProjectRepo.findAllByUserId(userId);
            const localProjectMap = new Map(
                localProjects.map((p) => [p.id, p])
            );

            // Update the project IDs cache for filtering realtime events
            this.userProjectIds.clear();
            for (const p of remoteProjects) {
                this.userProjectIds.add(p.id);
            }
            for (const p of localProjects) {
                this.userProjectIds.add(p.id);
            }

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
            this.syncStateGateway?.setLastSyncedAt(new Date());
            this.isOnline = true;
            this.syncStateGateway?.setStatus("online");
        } catch (error) {
            console.error("[SynchronizationService] Sync failed:", error);
            this.syncStateGateway?.setStatus("offline");
        } finally {
            this.isSyncing = false;
            // Process any events that were queued during sync
            void this.processEventQueue();
        }
    }

    /**
     * Process queued realtime events that arrived during a sync operation.
     * Deduplicates by entityId (keeping only the most recent event per entity).
     */
    private async processEventQueue(): Promise<void> {
        if (this.isProcessingQueue || this.eventQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            // Deduplicate: keep only the most recent event per entity
            const latestByEntity = new Map<string, QueuedRealtimeEvent>();
            for (const event of this.eventQueue) {
                const key = `${event.entityType}:${event.entityId}`;
                const existing = latestByEntity.get(key);
                if (!existing || event.timestamp > existing.timestamp) {
                    latestByEntity.set(key, event);
                }
            }

            // Clear the queue
            this.eventQueue = [];

            console.log(
                `[SynchronizationService] Processing ${latestByEntity.size} queued events`
            );

            // Process each unique event
            for (const event of latestByEntity.values()) {
                if (!this.currentUserId) break; // User logged out

                await this.handleRemoteEntityChange(
                    event.entityType,
                    event.entityId,
                    event.projectId,
                    event.eventType
                );
            }
        } catch (error) {
            console.error(
                "[SynchronizationService] Error processing event queue:",
                error
            );
        } finally {
            this.isProcessingQueue = false;
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
        const remote =
            await this.supabaseChapterRepo.findByProjectId(projectId);
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
        const remote =
            await this.supabaseCharacterRepo.findByProjectId(projectId);
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
        const remote =
            await this.supabaseLocationRepo.findByProjectId(projectId);
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
        const remote =
            await this.supabaseOrganizationRepo.findByProjectId(projectId);
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
        const remote =
            await this.supabaseScrapNoteRepo.findByProjectId(projectId);
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
        const remote =
            await this.supabaseAssetRepo.findImagesByProjectId(projectId);
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
        const remote =
            await this.supabaseAssetRepo.findBGMByProjectId(projectId);
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
        const remote =
            await this.supabaseAssetRepo.findPlaylistsByProjectId(projectId);
        const local =
            await this.fsAssetRepo.findPlaylistsByProjectId(projectId);
        const localMap = new Map(local.map((p) => [p.id, p]));
        const remoteMap = new Map(remote.map((p) => [p.id, p]));

        for (const remotePlaylist of remote) {
            if (await deletionLog.isDeleted(remotePlaylist.id)) continue;

            const localPlaylist = localMap.get(remotePlaylist.id);
            if (
                !localPlaylist ||
                remotePlaylist.updatedAt > localPlaylist.updatedAt
            ) {
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
                await this.supabaseAssetRepo.savePlaylist(
                    projectId,
                    localPlaylist
                );
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
                const remoteTimestamp = await this.getRemoteUpdatedAt(
                    item.entityType,
                    item.entityId
                );

                // If remote was updated after local deletion, skip the deletion (remote wins)
                if (
                    remoteTimestamp &&
                    remoteTimestamp.getTime() > item.timestamp
                ) {
                    console.log(
                        `[SynchronizationService] Skipping deletion of ${item.entityId}: remote is newer`
                    );
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
                console.warn(
                    "[SynchronizationService] Failed to process pending deletion",
                    item,
                    error
                );
            }
        }

        // 2. Process Remote Deletions (Pull to Local)
        const remoteDeletions =
            await this.supabaseDeletionLogRepo.findAllByUserId(userId);
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
                        console.log(
                            `[SynchronizationService] Resurrecting ${deletion.entity_id}: local is newer`
                        );
                        await this.supabaseDeletionLogRepo.delete(deletion.id);
                    } else {
                        // Remote deletion is newer - delete locally
                        await this.deleteLocalEntity(
                            deletion.entity_type as EntityType,
                            deletion.entity_id
                        );
                    }
                }
            } catch (error) {
                console.warn(
                    "[SynchronizationService] Failed to process remote deletion",
                    deletion,
                    error
                );
            }
        }
    }

    private async getRemoteUpdatedAt(
        type: EntityType,
        id: string
    ): Promise<Date | null> {
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

    private async getLocalUpdatedAt(
        type: EntityType,
        id: string
    ): Promise<Date | null> {
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

    private async deleteRemoteEntity(
        type: EntityType,
        id: string
    ): Promise<void> {
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

    private async deleteLocalEntity(
        type: EntityType,
        id: string
    ): Promise<void> {
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
