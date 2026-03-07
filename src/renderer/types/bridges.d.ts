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
        listener: (payload: { command: string; data: any }) => void,
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
                listener: (payload: {
                    type: "audio" | "image";
                    progress: number;
                }) => void,
            ): () => IpcRenderer;
        };
        importEvents: {
            onProgress(
                listener: (payload: { progress: number }) => void,
            ): () => IpcRenderer;
        };
        // Note: syncEvents was removed as conflicts are now auto-resolved using "most recent wins" strategy.
    }
}

export {};
