export type StorageScope =
    | "project"
    | "chapter"
    | "character"
    | "location"
    | "organization"
    | "scrap-note"
    | "misc";
export type StorageAssetType =
    | "image"
    | "bgm"
    | "playlist"
    | "document"
    | "audio"
    | "other";

export interface UploadAssetOptions {
    scope: StorageScope;
    scopeId: string;
    assetType: StorageAssetType;
    extension?: string;
}

export interface StorageUploadResult {
    url: string;
    path: string;
}

export interface IStorageService {
    uploadAsset(
        fileData: ArrayBuffer,
        options: UploadAssetOptions
    ): Promise<StorageUploadResult>; // Returns URL + storage path
    deleteFile(path: string): Promise<void>;
    getUrl(path: string): string;
}
