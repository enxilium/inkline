import { contextBridge, ipcRenderer } from "electron";
import {
    controllerChannels,
    type ControllerChannelMap,
    type RendererApi,
} from "../controllers/contracts";
import {
    AUTH_STATE_CHANGED_CHANNEL,
    type AuthStatePayload,
} from "../controllers/auth/AuthStateGateway";
import {
    SYNC_STATE_CHANGED_CHANNEL,
    SYNC_REMOTE_CHANGE_CHANNEL,
    SYNC_CONFLICT_CHANNEL,
    SYNC_ENTITY_UPDATED_CHANNEL,
    SYNC_ENTITY_DELETED_CHANNEL,
    type SyncStatePayload,
    type RemoteChangePayload,
    type ConflictPayload,
    type EntityUpdatedPayload,
    type EntityDeletedPayload,
} from "../controllers/sync/SyncStateGateway";

type AsyncHandler = (...args: unknown[]) => Promise<unknown>;

type ControllerInvoker<THandler extends AsyncHandler> = (
    ...args: Parameters<THandler>
) => ReturnType<THandler>;

const bindController = <THandler extends AsyncHandler>(
    channel: string
): ControllerInvoker<THandler> => {
    return ((...args: Parameters<THandler>) =>
        ipcRenderer.invoke(channel, ...args)) as ControllerInvoker<THandler>;
};

const createCategoryBindings = (category: keyof RendererApi) => {
    const categoryChannels = controllerChannels[category];
    const bindings: Record<string, (...args: unknown[]) => Promise<unknown>> =
        {};

    for (const [action, channel] of Object.entries(categoryChannels)) {
        bindings[action] = bindController(channel as string);
    }

    return bindings;
};

const createRendererApi = (): RendererApi => {
    const bindings: Record<
        string,
        Record<string, (...args: unknown[]) => Promise<unknown>>
    > = {};

    for (const category of Object.keys(controllerChannels)) {
        bindings[category] = createCategoryBindings(
            category as keyof RendererApi
        );
    }

    return bindings as RendererApi;
};

const ui = {
    showContextMenu: (type: string, data?: any) =>
        ipcRenderer.send("ui:show-context-menu", type, data),
    onContextMenuCommand: (
        listener: (payload: { command: string; data: any }) => void
    ) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: { command: string; data: any }
        ) => {
            listener(payload);
        };
        ipcRenderer.on("context-menu-command", handler);
        return () =>
            ipcRenderer.removeListener("context-menu-command", handler);
    },
};

contextBridge.exposeInMainWorld("ui", ui);

const api = createRendererApi();

contextBridge.exposeInMainWorld("api", api);

type AuthStateListener = (payload: AuthStatePayload) => void;

const createAuthEvents = () => {
    const onStateChanged = (listener: AuthStateListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: AuthStatePayload
        ) => {
            listener(payload);
        };
        ipcRenderer.on(AUTH_STATE_CHANGED_CHANNEL, handler);
        return () =>
            ipcRenderer.removeListener(AUTH_STATE_CHANGED_CHANNEL, handler);
    };

    return { onStateChanged };
};

const authEvents = createAuthEvents();

contextBridge.exposeInMainWorld("authEvents", authEvents);

// Sync events for real-time synchronization status and conflicts
type SyncStateListener = (payload: SyncStatePayload) => void;
type RemoteChangeListener = (payload: RemoteChangePayload) => void;
type ConflictListener = (payload: ConflictPayload) => void;
type EntityUpdatedListener = (payload: EntityUpdatedPayload) => void;
type EntityDeletedListener = (payload: EntityDeletedPayload) => void;

const createSyncEvents = () => {
    const onStateChanged = (listener: SyncStateListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: SyncStatePayload
        ) => {
            listener(payload);
        };
        ipcRenderer.on(SYNC_STATE_CHANGED_CHANNEL, handler);
        return () =>
            ipcRenderer.removeListener(SYNC_STATE_CHANGED_CHANNEL, handler);
    };

    const onRemoteChange = (listener: RemoteChangeListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: RemoteChangePayload
        ) => {
            listener(payload);
        };
        ipcRenderer.on(SYNC_REMOTE_CHANGE_CHANNEL, handler);
        return () =>
            ipcRenderer.removeListener(SYNC_REMOTE_CHANGE_CHANNEL, handler);
    };

    const onConflict = (listener: ConflictListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: ConflictPayload
        ) => {
            listener(payload);
        };
        ipcRenderer.on(SYNC_CONFLICT_CHANNEL, handler);
        return () => ipcRenderer.removeListener(SYNC_CONFLICT_CHANNEL, handler);
    };

    const onEntityUpdated = (listener: EntityUpdatedListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: EntityUpdatedPayload
        ) => {
            listener(payload);
        };
        ipcRenderer.on(SYNC_ENTITY_UPDATED_CHANNEL, handler);
        return () =>
            ipcRenderer.removeListener(SYNC_ENTITY_UPDATED_CHANNEL, handler);
    };

    const onEntityDeleted = (listener: EntityDeletedListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: EntityDeletedPayload
        ) => {
            listener(payload);
        };
        ipcRenderer.on(SYNC_ENTITY_DELETED_CHANNEL, handler);
        return () =>
            ipcRenderer.removeListener(SYNC_ENTITY_DELETED_CHANNEL, handler);
    };

    const resolveConflict = (
        entityType: string,
        entityId: string,
        projectId: string,
        resolution: "accept-remote" | "keep-local"
    ) => {
        return ipcRenderer.invoke(
            "sync:resolveConflict",
            entityType,
            entityId,
            projectId,
            resolution
        );
    };

    return {
        onStateChanged,
        onRemoteChange,
        onConflict,
        onEntityUpdated,
        onEntityDeleted,
        resolveConflict,
    };
};

const syncEvents = createSyncEvents();
contextBridge.exposeInMainWorld("syncEvents", syncEvents);

type GenerationProgressListener = (payload: {
    type: "audio" | "image";
    progress: number;
}) => void;

const createGenerationEvents = () => {
    const onProgress = (listener: GenerationProgressListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: { type: "audio" | "image"; progress: number }
        ) => {
            listener(payload);
        };
        ipcRenderer.on("generation-progress", handler);
        return () => ipcRenderer.removeListener("generation-progress", handler);
    };
    return { onProgress };
};

const generationEvents = createGenerationEvents();
contextBridge.exposeInMainWorld("generationEvents", generationEvents);

type TitleBarOverlayOptions = {
    color: string;
    symbolColor?: string;
    height?: number;
};

const windowControls = {
    setTitleBarOverlay: (options: TitleBarOverlayOptions) =>
        ipcRenderer.invoke(
            "window:setTitleBarOverlay",
            options
        ) as Promise<void>,
};

contextBridge.exposeInMainWorld("windowControls", windowControls);

declare global {
    interface Window {
        api: typeof api;
        ui: typeof ui;
        authEvents: typeof authEvents;
        syncEvents: typeof syncEvents;
        generationEvents: typeof generationEvents;
        windowControls: typeof windowControls;
    }
}
