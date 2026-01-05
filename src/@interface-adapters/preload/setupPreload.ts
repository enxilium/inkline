import { contextBridge, ipcRenderer } from "electron";
import {
    SETUP_CHANNELS,
    type SetupConfig,
    type DownloadProgress,
    type DownloadRequest,
    type ModelStatus,
    type ComfyUIStatus,
    type LanguageToolStatus,
    type PlatformInfo,
} from "../controllers/setup/setupChannels";

// API exposed to the setup renderer
const setupApi = {
    completeSetup: (config: SetupConfig): Promise<void> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.COMPLETE_SETUP, config);
    },

    startDownloads: (request: DownloadRequest): Promise<void> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.START_DOWNLOADS, request);
    },

    cancelDownloads: (): Promise<void> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.CANCEL_DOWNLOADS);
    },

    checkModelStatus: (): Promise<ModelStatus> => {
        return ipcRenderer.invoke(SETUP_CHANNELS.CHECK_MODEL_STATUS);
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
};

// Events for real-time updates
const setupEvents = {
    onDownloadProgress: (listener: (progress: DownloadProgress) => void) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            progress: DownloadProgress
        ) => {
            listener(progress);
        };
        ipcRenderer.on(SETUP_CHANNELS.DOWNLOAD_PROGRESS, handler);
        return () =>
            ipcRenderer.removeListener(
                SETUP_CHANNELS.DOWNLOAD_PROGRESS,
                handler
            );
    },
};

contextBridge.exposeInMainWorld("setupApi", setupApi);
contextBridge.exposeInMainWorld("setupEvents", setupEvents);
