import { Buffer } from "buffer";

import {
    IStorageService,
    StorageUploadResult,
    UploadAssetOptions,
} from "../../@core/domain/services/IStorageService";
import { fileSystemService } from "./FileSystemService";

const LOCAL_ASSET_SCHEME = "inkline-asset://local/";

export const isLocalAssetPath = (value: string): boolean => {
    const normalized = value.trim();
    return (
        normalized.startsWith(LOCAL_ASSET_SCHEME) ||
        normalized.startsWith("assets/") ||
        normalized.startsWith("/assets/")
    );
};

export class FileSystemStorageService implements IStorageService {
    async uploadAsset(
        fileData: ArrayBuffer,
        options: UploadAssetOptions,
    ): Promise<StorageUploadResult> {
        const path = this.buildObjectPath(options);
        const buffer = Buffer.from(fileData);

        await fileSystemService.writeFile(path, buffer);

        return {
            path,
            url: this.getUrl(path),
        };
    }

    async deleteFile(path: string): Promise<void> {
        const objectPath = this.extractObjectPath(path);
        if (!objectPath) {
            return;
        }

        await fileSystemService.deleteFile(objectPath);
    }

    getUrl(path: string): string {
        const normalizedPath = this.extractObjectPath(path);
        if (!normalizedPath) {
            return path;
        }

        return `${LOCAL_ASSET_SCHEME}${encodeURI(normalizedPath)}`;
    }

    private buildObjectPath(options: UploadAssetOptions): string {
        const safeScope = options.scope || "misc";
        const scopeId =
            options.scopeId?.replace(/[^a-zA-Z0-9-_]/g, "") || "shared";
        const extension = this.resolveExtension(options.extension);
        const name = `${options.assetType}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;

        return `assets/${safeScope}/${scopeId}/${name}.${extension}`;
    }

    private resolveExtension(extension?: string): string {
        if (!extension) {
            return "bin";
        }

        return extension.replace(/^\./, "").toLowerCase();
    }

    private extractObjectPath(pathValue: string): string | null {
        const trimmed = pathValue.trim();
        if (!trimmed) {
            return null;
        }

        if (trimmed.startsWith("inkline-asset://")) {
            try {
                const url = new URL(trimmed);
                if (url.hostname !== "local") {
                    return null;
                }

                const pathname = decodeURIComponent(url.pathname).replace(
                    /^\/+/,
                    "",
                );
                return pathname || null;
            } catch {
                return null;
            }
        }

        const normalized = trimmed.replace(/\\/g, "/").replace(/^\/+/, "");

        if (!normalized.startsWith("assets/")) {
            return null;
        }

        return normalized;
    }
}
