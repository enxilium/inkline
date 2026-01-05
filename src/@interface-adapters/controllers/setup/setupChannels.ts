// Shared channel constants for setup IPC communication
// This file can be safely imported by both main process and preload scripts

export const SETUP_CHANNELS = {
    COMPLETE_SETUP: "setup:complete",
    START_DOWNLOADS: "setup:startDownloads",
    CANCEL_DOWNLOADS: "setup:cancelDownloads",
    CHECK_MODEL_STATUS: "setup:checkModelStatus",
    CHECK_COMFYUI_STATUS: "setup:checkComfyUIStatus",
    CHECK_LANGUAGETOOL_STATUS: "setup:checkLanguageToolStatus",
    CHECK_PLATFORM: "setup:checkPlatform",
    DOWNLOAD_PROGRESS: "setup:downloadProgress",
} as const;

export interface SetupConfig {
    features: {
        aiChat: boolean;
        imageGeneration: boolean;
        audioGeneration: boolean;
    };
    theme: {
        colorScheme: "dark" | "light";
        accentColor: string;
    };
}

export interface DownloadProgress {
    downloadType: "comfyui" | "image" | "audio" | "languagetool";
    downloadedBytes: number;
    totalBytes: number;
    percentage: number;
    status: "pending" | "downloading" | "extracting" | "completed" | "error";
    error?: string;
}

export interface DownloadRequest {
    comfyui: boolean;
    image: boolean;
    audio: boolean;
    languagetool: boolean;
}

export interface ModelStatus {
    image: boolean;
    audio: boolean;
}

export interface ComfyUIStatus {
    installed: boolean;
}

export interface LanguageToolStatus {
    installed: boolean;
}

export interface PlatformInfo {
    platform: NodeJS.Platform;
    isWindows: boolean;
}
