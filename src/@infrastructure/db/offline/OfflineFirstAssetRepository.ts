import { IAssetRepository } from "../../../@core/domain/repositories/IAssetRepository";
import { Image } from "../../../@core/domain/entities/story/world/Image";
import { BGM } from "../../../@core/domain/entities/story/world/BGM";
import { Playlist } from "../../../@core/domain/entities/story/world/Playlist";
import { SupabaseAssetRepository } from "../SupabaseAssetRepository";
import { FileSystemAssetRepository } from "../filesystem/FileSystemAssetRepository";
import { SupabaseService } from "../SupabaseService";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";
import * as fs from "fs/promises";

import { deletionLog } from "./DeletionLog";
import { pendingUpdates } from "./PendingUpdates";

/**
 * Offline-first asset repository that uses local filesystem as primary storage
 * and syncs with Supabase when online. Uses "most recent wins" for conflict resolution.
 */
export class OfflineFirstAssetRepository implements IAssetRepository {
    constructor(
        private supabaseRepo: SupabaseAssetRepository,
        private fsRepo: FileSystemAssetRepository,
    ) {}

    // ========================================================================
    // IMAGES
    // ========================================================================

    async saveImage(projectId: string, image: Image): Promise<void> {
        await this.fsRepo.saveImage(projectId, image);
        try {
            await this.supabaseRepo.saveImage(projectId, image);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "image",
                entityId: image.id,
                projectId,
                operation: "save",
                payload: image,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn("Failed to save image to Supabase (Offline?)", error);
        }
    }

    async findImageById(id: string): Promise<Image | null> {
        let remote: Image | null = null;
        try {
            remote = await this.supabaseRepo.findImageById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findImageById(id);
        const result = await this.pickPlayableAsset(local, remote);

        if (result) {
            await this.resolveLocalUrl(result);
        }
        return result;
    }

    async findImagesByProjectId(projectId: string): Promise<Image[]> {
        let remote: Image[] = [];
        try {
            remote = await this.supabaseRepo.findImagesByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findImagesByProjectId(projectId);
        const merged = await this.mergePlayableAssets(local, remote);

        for (const img of merged) {
            await this.resolveLocalUrl(img);
        }
        return merged;
    }

    async findImagesByIds(ids: string[]): Promise<Image[]> {
        const images: Image[] = [];
        for (const id of ids) {
            const img = await this.findImageById(id);
            if (img) images.push(img);
        }
        return images;
    }

    async deleteImage(id: string): Promise<void> {
        const projectId = await this.getAssetProjectId(id);

        // Best-effort: remove local downloaded binary if present
        try {
            const local = await this.fsRepo.findImageById(id);
            if (local?.storagePath) {
                const localPath = this.toLocalObjectPath(local.storagePath);
                if (await fileSystemService.exists(localPath)) {
                    await fileSystemService.deleteFile(localPath);
                }
            }
        } catch {
            // ignore
        }

        await this.fsRepo.deleteImage(id);
        await deletionLog.add({
            entityType: "image",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.deleteImage(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete image in Supabase (Offline?)",
                error,
            );
        }
    }

    async deleteImagesByProjectId(projectId: string): Promise<void> {
        // Get all images first so we can log their deletions
        const images = await this.fsRepo.findImagesByProjectId(projectId);
        const timestamp = Date.now();

        for (const img of images) {
            await deletionLog.add({
                entityType: "image",
                entityId: img.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deleteImagesByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteImagesByProjectId(projectId);
            // Remove from deletion log on success
            for (const img of images) {
                await deletionLog.remove(img.id);
            }
        } catch (error) {
            console.warn(
                "Failed to delete images in Supabase (Offline?)",
                error,
            );
        }
    }

    // ========================================================================
    // BGM
    // ========================================================================

    async saveBGM(projectId: string, bgm: BGM): Promise<void> {
        await this.fsRepo.saveBGM(projectId, bgm);
        try {
            await this.supabaseRepo.saveBGM(projectId, bgm);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "bgm",
                entityId: bgm.id,
                projectId,
                operation: "save",
                payload: bgm,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn("Failed to save BGM in Supabase (Offline?)", error);
        }
    }

    async findBGMById(id: string): Promise<BGM | null> {
        let remote: BGM | null = null;
        try {
            remote = await this.supabaseRepo.findBGMById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findBGMById(id);
        const result = await this.pickPlayableAsset(local, remote);

        if (result) {
            await this.resolveLocalUrl(result);
        }
        return result;
    }

    async findBGMByProjectId(projectId: string): Promise<BGM[]> {
        let remote: BGM[] = [];
        try {
            remote = await this.supabaseRepo.findBGMByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findBGMByProjectId(projectId);
        const merged = await this.mergePlayableAssets(local, remote);

        for (const bgm of merged) {
            await this.resolveLocalUrl(bgm);
        }
        return merged;
    }

    async findBGMsByIds(ids: string[]): Promise<BGM[]> {
        const results: BGM[] = [];
        for (const id of ids) {
            const item = await this.findBGMById(id);
            if (item) results.push(item);
        }
        return results;
    }

    async deleteBGM(id: string): Promise<void> {
        const projectId = await this.getAssetProjectId(id);

        // Best-effort: remove local downloaded binary if present
        try {
            const local = await this.fsRepo.findBGMById(id);
            if (local?.storagePath) {
                const localPath = this.toLocalObjectPath(local.storagePath);
                if (await fileSystemService.exists(localPath)) {
                    await fileSystemService.deleteFile(localPath);
                }
            }
        } catch {
            // ignore
        }

        await this.fsRepo.deleteBGM(id);
        await deletionLog.add({
            entityType: "bgm",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.deleteBGM(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn("Failed to delete BGM in Supabase (Offline?)", error);
        }
    }

    async deleteBGMByProjectId(projectId: string): Promise<void> {
        const bgms = await this.fsRepo.findBGMByProjectId(projectId);
        const timestamp = Date.now();

        for (const bgm of bgms) {
            await deletionLog.add({
                entityType: "bgm",
                entityId: bgm.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deleteBGMByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteBGMByProjectId(projectId);
            for (const bgm of bgms) {
                await deletionLog.remove(bgm.id);
            }
        } catch (error) {
            console.warn("Failed to delete BGMs in Supabase (Offline?)", error);
        }
    }

    // ========================================================================
    // PLAYLISTS
    // ========================================================================

    async savePlaylist(projectId: string, playlist: Playlist): Promise<void> {
        await this.fsRepo.savePlaylist(projectId, playlist);
        try {
            await this.supabaseRepo.savePlaylist(projectId, playlist);
        } catch (error) {
            await pendingUpdates.add({
                entityType: "playlist",
                entityId: playlist.id,
                projectId,
                operation: "save",
                payload: playlist,
                attempts: 0,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastError:
                    error instanceof Error ? error.message : String(error),
            });
            console.warn(
                "Failed to save Playlist in Supabase (Offline?)",
                error,
            );
        }
    }

    async findPlaylistById(id: string): Promise<Playlist | null> {
        let remote: Playlist | null = null;
        try {
            remote = await this.supabaseRepo.findPlaylistById(id);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findPlaylistById(id);
        return this.pickMostRecent(local, remote);
    }

    async findPlaylistsByProjectId(projectId: string): Promise<Playlist[]> {
        let remote: Playlist[] = [];
        try {
            remote =
                await this.supabaseRepo.findPlaylistsByProjectId(projectId);
        } catch {
            // Offline
        }

        const local = await this.fsRepo.findPlaylistsByProjectId(projectId);
        return this.mergeByMostRecent(local, remote);
    }

    async findPlaylistsByIds(ids: string[]): Promise<Playlist[]> {
        const results: Playlist[] = [];
        for (const id of ids) {
            const item = await this.findPlaylistById(id);
            if (item) results.push(item);
        }
        return results;
    }

    async deletePlaylist(id: string): Promise<void> {
        const projectId = await this.getAssetProjectId(id);

        // Best-effort: remove local downloaded binary if present
        // (Playlists may or may not have a storagePath depending on implementation.)
        try {
            const local = await this.fsRepo.findPlaylistById(id);
            if (local?.storagePath) {
                const localPath = this.toLocalObjectPath(local.storagePath);
                if (await fileSystemService.exists(localPath)) {
                    await fileSystemService.deleteFile(localPath);
                }
            }
        } catch {
            // ignore
        }

        await this.fsRepo.deletePlaylist(id);
        await deletionLog.add({
            entityType: "playlist",
            entityId: id,
            projectId: projectId || "",
            timestamp: Date.now(),
        });

        try {
            await this.supabaseRepo.deletePlaylist(id);
            await deletionLog.remove(id);
        } catch (error) {
            console.warn(
                "Failed to delete Playlist in Supabase (Offline?)",
                error,
            );
        }
    }

    async deletePlaylistsByProjectId(projectId: string): Promise<void> {
        const playlists = await this.fsRepo.findPlaylistsByProjectId(projectId);
        const timestamp = Date.now();

        for (const playlist of playlists) {
            await deletionLog.add({
                entityType: "playlist",
                entityId: playlist.id,
                projectId,
                timestamp,
            });
        }

        await this.fsRepo.deletePlaylistsByProjectId(projectId);

        try {
            await this.supabaseRepo.deletePlaylistsByProjectId(projectId);
            for (const playlist of playlists) {
                await deletionLog.remove(playlist.id);
            }
        } catch (error) {
            console.warn(
                "Failed to delete Playlists in Supabase (Offline?)",
                error,
            );
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Pick the most recently updated entity between local and remote.
     * Returns null if both are null.
     */
    private pickMostRecent<T extends { id: string; updatedAt: Date }>(
        local: T | null,
        remote: T | null,
    ): T | null {
        if (local && remote) {
            return remote.updatedAt > local.updatedAt ? remote : local;
        }
        return local || remote;
    }

    /**
     * Merge local and remote arrays, keeping the most recently updated version of each entity.
     */
    private mergeByMostRecent<T extends { id: string; updatedAt: Date }>(
        local: T[],
        remote: T[],
    ): T[] {
        const map = new Map<string, T>();

        for (const item of local) {
            map.set(item.id, item);
        }

        for (const item of remote) {
            const existing = map.get(item.id);
            if (!existing || item.updatedAt > existing.updatedAt) {
                map.set(item.id, item);
            }
        }

        return Array.from(map.values());
    }

    private async mergePlayableAssets<T extends Image | BGM>(
        local: T[],
        remote: T[],
    ): Promise<T[]> {
        const localById = new Map(local.map((item) => [item.id, item]));
        const remoteById = new Map(remote.map((item) => [item.id, item]));
        const merged = this.mergeByMostRecent(local, remote);
        const resolved: T[] = [];

        for (const item of merged) {
            const selected = await this.pickPlayableAsset(
                localById.get(item.id) ?? null,
                remoteById.get(item.id) ?? null,
            );
            resolved.push(selected ?? item);
        }

        return resolved;
    }

    /**
     * Get the project ID for an asset from local storage or remote.
     */
    private async getAssetProjectId(assetId: string): Promise<string | null> {
        // Try local first (faster)
        const projectId = await this.getProjectIdFromFileLocation(assetId);
        if (projectId) {
            return projectId;
        }

        // Try remote
        try {
            const client = SupabaseService.getClient();
            const { data } = await client
                .from("assets")
                .select("project_id")
                .eq("id", assetId)
                .single();
            return data?.project_id || null;
        } catch {
            return null;
        }
    }

    /**
     * Get projectId by scanning for the asset file location.
     */
    private async getProjectIdFromFileLocation(
        assetId: string,
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);
            for (const projectFile of projects) {
                if (projectFile.endsWith(".json")) {
                    const projectId = projectFile.replace(".json", "");
                    const assetPath = path.join(
                        "users",
                        user,
                        "projects",
                        projectId,
                        "assets",
                        `${assetId}.json`,
                    );
                    if (await fileSystemService.exists(assetPath)) {
                        return projectId;
                    }
                }
            }
        }
        return null;
    }

    private normalizeStoragePath(storagePath: string): string {
        return storagePath.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    }

    private toLocalObjectPath(storagePath: string): string {
        const normalized = this.normalizeStoragePath(storagePath);
        if (!normalized) {
            return "";
        }

        return normalized.startsWith("assets/")
            ? normalized
            : `assets/${normalized}`;
    }

    private toLocalAbsolutePath(storagePath: string): string {
        const objectPath = this.toLocalObjectPath(storagePath);
        return fileSystemService.resolvePath(objectPath);
    }

    private async hasLocalAssetFile(storagePath: string): Promise<boolean> {
        if (!storagePath.trim()) {
            return false;
        }

        try {
            await fs.access(this.toLocalAbsolutePath(storagePath));
            return true;
        } catch {
            return false;
        }
    }

    private isCloudUrl(url: string): boolean {
        const normalized = url.trim().toLowerCase();
        return (
            normalized.startsWith("http://") ||
            normalized.startsWith("https://")
        );
    }

    private async pickPlayableAsset<T extends Image | BGM>(
        local: T | null,
        remote: T | null,
    ): Promise<T | null> {
        const selected = this.pickMostRecent(local, remote);
        if (!selected || !local || !remote) {
            return selected;
        }

        if (selected !== local) {
            return selected;
        }

        const localExists = await this.hasLocalAssetFile(local.storagePath);
        if (localExists) {
            return local;
        }

        return this.isCloudUrl(remote.url) ? remote : selected;
    }

    /**
     * Resolve a local file URL for an asset if the file exists locally.
     * Uses the custom inkline-asset:// protocol for secure local file access.
     */
    private async resolveLocalUrl(asset: Image | BGM): Promise<void> {
        if (!asset.storagePath) return;

        const localPath = this.toLocalAbsolutePath(asset.storagePath);
        const objectPath = this.toLocalObjectPath(asset.storagePath);
        if (!objectPath) {
            return;
        }

        try {
            await fs.access(localPath);
            // Use custom protocol: inkline-asset://local/{objectPath}
            // The "local" host is a placeholder, the pathname contains the actual path
            asset.url = `inkline-asset://local/${objectPath}`;
        } catch {
            // Keep remote URL
        }
    }
}
