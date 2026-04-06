import type { IpcRenderer } from "electron";
import type { RendererApi } from "../../@interface-adapters/controllers/contracts";
import type { AuthStatePayload } from "../../@interface-adapters/controllers/auth/AuthStateGateway";
import type { TutorialState } from "../../@interface-adapters/controllers/setup/setupChannels";
import type {
    SyncStatePayload,
    RemoteChangePayload,
    ConflictPayload,
    EntityUpdatedPayload,
    EntityDeletedPayload,
    SyncTerminalFailurePayload,
    EntityType as SyncEntityType,
} from "../../@interface-adapters/controllers/sync/SyncStateGateway";
import type { GenerationProgressPayload } from "../../@interface-adapters/controllers/generation/generationProgress";

export type ContextMenuType =
    | "editor"
    | "binder_chapter"
    | "binder_project"
    | "binder_default";

export interface UiApi {
    showContextMenu: (type: ContextMenuType, data?: unknown) => void;
    onContextMenuCommand: (
        listener: (payload: { command: string; data: unknown }) => void,
    ) => () => IpcRenderer;
}

declare global {
    interface Window {
        api: RendererApi;
        ui: UiApi;
        fileDialog: {
            showSaveDialog(options: {
                title?: string;
                defaultPath?: string;
                filters?: { name: string; extensions: string[] }[];
            }): Promise<{ canceled: boolean; filePath?: string }>;
            showOpenDialog(options: {
                title?: string;
                filters?: { name: string; extensions: string[] }[];
                properties?: string[];
            }): Promise<{ canceled: boolean; filePaths: string[] }>;
        };
        authEvents: {
            onStateChanged(
                listener: (payload: AuthStatePayload) => void,
            ): () => IpcRenderer;
        };
        generationEvents: {
            onProgress(
                listener: (payload: GenerationProgressPayload) => void,
            ): () => IpcRenderer;
        };
        appInfoApi: {
            getVersion: () => Promise<string>;
        };
        tutorialApi: {
            getState: () => Promise<TutorialState>;
            markCompleted: () => Promise<void>;
            markSkipped: () => Promise<void>;
            resetProgress: () => Promise<void>;
        };
        importEvents: {
            onProgress(
                listener: (payload: { progress: number }) => void,
            ): () => IpcRenderer;
        };
        syncEvents: {
            onStateChanged(
                listener: (payload: SyncStatePayload) => void,
            ): () => IpcRenderer;
            onRemoteChange(
                listener: (payload: RemoteChangePayload) => void,
            ): () => IpcRenderer;
            onConflict(
                listener: (payload: ConflictPayload) => void,
            ): () => IpcRenderer;
            onEntityUpdated(
                listener: (payload: EntityUpdatedPayload) => void,
            ): () => IpcRenderer;
            onEntityDeleted(
                listener: (payload: EntityDeletedPayload) => void,
            ): () => IpcRenderer;
            onTerminalFailure(
                listener: (payload: SyncTerminalFailurePayload) => void,
            ): () => IpcRenderer;
            resolveConflict: (
                entityType: SyncEntityType,
                entityId: string,
                projectId: string,
                resolution: "accept-remote" | "keep-local",
            ) => Promise<void>;
        };
    }
}

export {};
