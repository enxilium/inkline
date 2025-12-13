import type { IpcRenderer } from "electron";
import type { RendererApi } from "../../@interface-adapters/controllers/contracts";
import type { AuthStatePayload } from "../../@interface-adapters/controllers/auth/AuthStateGateway";

declare global {
    interface Window {
        api: RendererApi;
        authEvents: {
            onStateChanged(
                listener: (payload: AuthStatePayload) => void
            ): () => IpcRenderer;
        };
    }
}

export {};
