import { BrowserWindow } from "electron";
import { EventEmitter } from "events";

export const SYNC_STATE_CHANGED_CHANNEL = "sync:stateChanged";
export const SYNC_REMOTE_CHANGE_CHANNEL = "sync:remoteChange";
export const SYNC_CONFLICT_CHANNEL = "sync:conflict";
export const SYNC_ENTITY_UPDATED_CHANNEL = "sync:entityUpdated";
export const SYNC_ENTITY_DELETED_CHANNEL = "sync:entityDeleted";

export type SyncStatus = "online" | "offline" | "syncing";

export type SyncStatePayload = {
    status: SyncStatus;
    lastSyncedAt: string | null;
};

export type EntityType =
    | "project"
    | "chapter"
    | "character"
    | "location"
    | "organization"
    | "scrapNote"
    | "image"
    | "bgm"
    | "playlist";

export type RemoteChangePayload = {
    entityType: EntityType;
    entityId: string;
    projectId: string;
    changeType: "INSERT" | "UPDATE" | "DELETE";
    updatedAt: string;
};

export type ConflictPayload = {
    entityType: EntityType;
    entityId: string;
    projectId: string;
    entityName: string;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
};

export type ConflictResolution = "accept-remote" | "keep-local";

/**
 * Payload for incremental entity updates sent to the renderer.
 * Contains the full updated entity data so the UI can update in place.
 */
export type EntityUpdatedPayload = {
    entityType: EntityType;
    entityId: string;
    projectId: string;
    data: unknown; // The full entity object
};

/**
 * Payload for entity deletions sent to the renderer.
 */
export type EntityDeletedPayload = {
    entityType: EntityType;
    entityId: string;
    projectId: string;
};

export interface SyncStateGateway {
    setStatus(status: SyncStatus): void;
    setLastSyncedAt(timestamp: Date | null): void;
    getSnapshot(): SyncStatePayload;
    notifyRemoteChange(payload: RemoteChangePayload): void;
    notifyConflict(payload: ConflictPayload): void;
    notifyEntityUpdated(payload: EntityUpdatedPayload): void;
    notifyEntityDeleted(payload: EntityDeletedPayload): void;
}

export class ElectronSyncStateGateway
    extends EventEmitter
    implements SyncStateGateway
{
    private snapshot: SyncStatePayload = {
        status: "offline",
        lastSyncedAt: null,
    };

    setStatus(status: SyncStatus): void {
        this.snapshot = { ...this.snapshot, status };
        this.broadcast(SYNC_STATE_CHANGED_CHANNEL, this.snapshot);
    }

    setLastSyncedAt(timestamp: Date | null): void {
        this.snapshot = {
            ...this.snapshot,
            lastSyncedAt: timestamp?.toISOString() ?? null,
        };
        this.broadcast(SYNC_STATE_CHANGED_CHANNEL, this.snapshot);
    }

    getSnapshot(): SyncStatePayload {
        return this.snapshot;
    }

    notifyRemoteChange(payload: RemoteChangePayload): void {
        this.emit("remote-change", payload);
        this.broadcast(SYNC_REMOTE_CHANGE_CHANNEL, payload);
    }

    notifyConflict(payload: ConflictPayload): void {
        this.emit("conflict", payload);
        this.broadcast(SYNC_CONFLICT_CHANNEL, payload);
    }

    notifyEntityUpdated(payload: EntityUpdatedPayload): void {
        this.emit("entity-updated", payload);
        this.broadcast(SYNC_ENTITY_UPDATED_CHANNEL, payload);
    }

    notifyEntityDeleted(payload: EntityDeletedPayload): void {
        this.emit("entity-deleted", payload);
        this.broadcast(SYNC_ENTITY_DELETED_CHANNEL, payload);
    }

    private broadcast(channel: string, payload: unknown): void {
        const windows = BrowserWindow.getAllWindows();
        for (const window of windows) {
            if (!window.isDestroyed()) {
                window.webContents.send(channel, payload);
            }
        }
    }
}
