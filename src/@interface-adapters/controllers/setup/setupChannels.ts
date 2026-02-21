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

/** Channels for managing features from the main renderer (settings screen). */
export const FEATURE_CHANNELS = {
    GET_FEATURE_CONFIG: "features:getConfig",
    ENABLE_FEATURE: "features:enable",
    DISABLE_FEATURE: "features:disable",
    CANCEL_FEATURE_DOWNLOAD: "features:cancelDownload",
    FEATURE_DOWNLOAD_PROGRESS: "features:downloadProgress",
} as const;

export type FeatureKind = "imageGeneration" | "audioGeneration";

export interface FeatureConfig {
    features: {
        aiChat: boolean;
        imageGeneration: boolean;
        audioGeneration: boolean;
    };
    modelsDownloaded: {
        image: boolean;
        audio: boolean;
    };
    comfyuiInstalled: boolean;
    isWindows: boolean;
}

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
