import { Buffer } from "buffer";
import {
    IStorageService,
    StorageUploadResult,
    UploadAssetOptions,
} from "../../@core/domain/services/IStorageService";
import { SupabaseService } from "../db/SupabaseService";

const DEFAULT_BUCKET = "inkline-assets";

export class SupabaseStorageService implements IStorageService {
    constructor(private readonly bucketName: string = DEFAULT_BUCKET) {}

    async uploadAsset(
        fileData: ArrayBuffer,
        options: UploadAssetOptions
    ): Promise<StorageUploadResult> {
        const client = SupabaseService.getClient();
        const path = this.buildObjectPath(options);
        const buffer = Buffer.from(fileData);
        const extension = this.resolveExtension(options.extension);
        const contentType = this.resolveContentType(extension);

        const { error } = await client.storage
            .from(this.bucketName)
            .upload(path, buffer, {
                upsert: true,
                contentType,
                cacheControl: "3600",
            });

        if (error) {
            throw new Error(`Failed to upload asset: ${error.message}`);
        }

        const url = this.getUrl(path);
        return { url, path };
    }

    async deleteFile(path: string): Promise<void> {
        const objectPath = this.extractObjectPath(path);
        if (!objectPath) {
            return;
        }

        const client = SupabaseService.getClient();
        const { error } = await client.storage
            .from(this.bucketName)
            .remove([objectPath]);

        if (error) {
            throw new Error(`Failed to delete asset: ${error.message}`);
        }
    }

    getUrl(path: string): string {
        const client = SupabaseService.getClient();
        const objectPath = this.extractObjectPath(path) ?? path;
        const { data } = client.storage
            .from(this.bucketName)
            .getPublicUrl(objectPath);

        return data.publicUrl ?? path;
    }

    private buildObjectPath(options: UploadAssetOptions): string {
        const safeScope = options.scope || "misc";
        const scopeId =
            options.scopeId?.replace(/[^a-zA-Z0-9-_]/g, "") || "shared";
        const extension = this.resolveExtension(options.extension);
        const name = `${options.assetType}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 8)}`;
        return `${safeScope}/${scopeId}/${name}.${extension}`;
    }

    private resolveExtension(extension?: string): string {
        if (!extension) {
            return "bin";
        }
        return extension.replace(/^\./, "").toLowerCase();
    }

    private resolveContentType(extension: string): string {
        switch (extension) {
            case "png":
                return "image/png";
            case "jpg":
            case "jpeg":
                return "image/jpeg";
            case "webp":
                return "image/webp";
            case "mp3":
                return "audio/mpeg";
            case "wav":
                return "audio/wav";
            case "ogg":
                return "audio/ogg";
            case "m4a":
                return "audio/m4a";
            case "aac":
                return "audio/aac";
            case "txt":
                return "text/plain";
            case "json":
                return "application/json";
            default:
                return "application/octet-stream";
        }
    }

    private extractObjectPath(path: string): string | null {
        if (!path) {
            return null;
        }

        if (!path.startsWith("http")) {
            return path.replace(/^\/+/, "");
        }

        const match = path.match(/\/storage\/v1\/object\/public\/[^/]+\/(.*)$/);
        if (match && match[1]) {
            return match[1];
        }

        return null;
    }
}
