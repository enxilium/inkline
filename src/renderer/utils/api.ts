import type { IpcRenderer } from "electron";
import type { RendererApi } from "../../@interface-adapters/controllers/contracts";
import type { AuthStatePayload } from "../../@interface-adapters/controllers/auth/AuthStateGateway";

declare global {
    interface Window {
        api: RendererApi;
        authEvents: AuthEventsBridge;
    }
}

type AuthEventsBridge = {
    onStateChanged(
        listener: (payload: AuthStatePayload) => void
    ): () => IpcRenderer;
};

let cachedRendererApi: RendererApi | null = null;
let cachedAuthEvents: AuthEventsBridge | null = null;

export const ensureRendererApi = (): RendererApi => {
    if (cachedRendererApi) {
        return cachedRendererApi;
    }

    if (!window?.api) {
        throw new Error("Renderer bridge is unavailable.");
    }

    cachedRendererApi = window.api;
    return cachedRendererApi;
};

export const ensureAuthEvents = (): AuthEventsBridge => {
    if (cachedAuthEvents) {
        return cachedAuthEvents;
    }

    if (!window?.authEvents) {
        throw new Error("Auth events bridge is unavailable.");
    }

    cachedAuthEvents = window.authEvents;
    return cachedAuthEvents;
};
