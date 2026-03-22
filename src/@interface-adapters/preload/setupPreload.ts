import { contextBridge, ipcRenderer } from "electron";
import {
    SETUP_CHANNELS,
    type SetupConfig,
    type LegalPoliciesResponse,
    type DownloadProgress,
    type DownloadRequest,
    type ComfyUIStatus,
    type LanguageToolStatus,
    type PlatformInfo,
} from "../controllers/setup/setupChannels";

// API exposed to the setup renderer
const setupApi = {
    completeSetup: (config: SetupConfig): Promise<void> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.COMPLETE_SETUP, config);
    },

    getLegalPolicies: (): Promise<LegalPoliciesResponse> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.GET_LEGAL_POLICIES);
    },

    startDownloads: (request: DownloadRequest): Promise<void> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.START_DOWNLOADS, request);
    },

    cancelDownloads: (
        types?: ("comfyui" | "image" | "audio" | "languagetool")[],
    ): Promise<void> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.CANCEL_DOWNLOADS, types);
    },

    checkComfyUIStatus: (): Promise<ComfyUIStatus> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.CHECK_COMFYUI_STATUS);
    },

    checkLanguageToolStatus: (): Promise<LanguageToolStatus> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.CHECK_LANGUAGETOOL_STATUS);
    },

    checkPlatform: (): Promise<PlatformInfo> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.CHECK_PLATFORM);
    },

    closeWindow: (): void => {
        ipcRenderer.send(SETUP_CHANNELS.CLOSE_WINDOW);
    },
};

// Events for real-time updates
const setupEvents = {
    onDownloadProgress: (listener: (progress: DownloadProgress) => void) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            progress: DownloadProgress,
        ) => {
            listener(progress);
        };
        ipcRenderer.on(SETUP_CHANNELS.DOWNLOAD_PROGRESS, handler);
        return () =>
            ipcRenderer.removeListener(
                SETUP_CHANNELS.DOWNLOAD_PROGRESS,
                handler,
            );
    },
};

contextBridge.exposeInMainWorld("setupApi", setupApi);
contextBridge.exposeInMainWorld("setupEvents", setupEvents);
