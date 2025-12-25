import type { IpcRenderer } from "electron";
import type { RendererApi } from "../../@interface-adapters/controllers/contracts";
import type { AuthStatePayload } from "../../@interface-adapters/controllers/auth/AuthStateGateway";

export type ContextMenuType =
    | "editor"
    | "binder_chapter"
    | "binder_project"
    | "binder_default";

export interface UiApi {
    showContextMenu: (type: ContextMenuType, data?: any) => void;
    onContextMenuCommand: (
        listener: (payload: { command: string; data: any }) => void
    ) => () => IpcRenderer;
}

declare global {
    interface Window {
        api: RendererApi;
        ui: UiApi;
        authEvents: {
            onStateChanged(
                listener: (payload: AuthStatePayload) => void
            ): () => IpcRenderer;
        };
        // Note: syncEvents was removed as conflicts are now auto-resolved using "most recent wins" strategy.
    }
}

export {};
