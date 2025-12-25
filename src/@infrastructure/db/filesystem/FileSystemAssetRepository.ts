import { IAssetRepository } from "../../../@core/domain/repositories/IAssetRepository";
import { Image } from "../../../@core/domain/entities/story/world/Image";
import { BGM } from "../../../@core/domain/entities/story/world/BGM";
import { Playlist } from "../../../@core/domain/entities/story/world/Playlist";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type AssetType = "image" | "bgm" | "playlist";

type FileSystemAsset = {
    id: string;
    projectId: string;
    type: AssetType;
    url: string;
    storagePath: string;
    metadata: any;
    createdAt: string;
    updatedAt: string;
    // Playlist specific
    tracks?: any[];
};

export class FileSystemAssetRepository implements IAssetRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        assetId: string
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "assets",
            `${assetId}.json`
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", projectId, "assets");
    }

    // --- Images ---

    async saveImage(projectId: string, image: Image): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;

        const dto: FileSystemAsset = {
            id: image.id,
            projectId: projectId,
            type: "image",
            url: image.url,
            storagePath: image.storagePath,
            metadata: {},
            createdAt: image.createdAt.toISOString(),
            updatedAt: image.updatedAt.toISOString(),
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, image.id),
            dto
        );
    }

    async findImageById(id: string): Promise<Image | null> {
        const loc = await this.findFileLocation(id);
        if (loc) {
            const dto = await fileSystemService.readJson<FileSystemAsset>(
                loc.path
            );
            if (dto && dto.type === "image") return this.mapToImage(dto);
        }
        return null;
    }

    async findImagesByProjectId(projectId: string): Promise<Image[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const images: Image[] = [];
        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto = await fileSystemService.readJson<FileSystemAsset>(
                    path.join(dirPath, file)
                );
                if (dto && dto.type === "image")
                    images.push(this.mapToImage(dto));
            }
        }
        return images;
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
        const loc = await this.findFileLocation(id);
        if (loc) await fileSystemService.deleteFile(loc.path);
    }

    async deleteImagesByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        for (const file of files) {
            const dto = await fileSystemService.readJson<FileSystemAsset>(
                path.join(dirPath, file)
            );
            if (dto && dto.type === "image") {
                await fileSystemService.deleteFile(path.join(dirPath, file));
            }
        }
    }

    // --- BGM ---

    async saveBGM(projectId: string, bgm: BGM): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;

        const dto: FileSystemAsset = {
            id: bgm.id,
            projectId: projectId,
            type: "bgm",
            url: bgm.url,
            storagePath: bgm.storagePath,
            metadata: {},
            createdAt: bgm.createdAt.toISOString(),
            updatedAt: bgm.updatedAt.toISOString(),
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, bgm.id),
            dto
        );
    }

    async findBGMById(id: string): Promise<BGM | null> {
        const loc = await this.findFileLocation(id);
        if (loc) {
            const dto = await fileSystemService.readJson<FileSystemAsset>(
                loc.path
            );
            if (dto && dto.type === "bgm") return this.mapToBGM(dto);
        }
        return null;
    }

    async findBGMByProjectId(projectId: string): Promise<BGM[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const bgms: BGM[] = [];
        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto = await fileSystemService.readJson<FileSystemAsset>(
                    path.join(dirPath, file)
                );
                if (dto && dto.type === "bgm") bgms.push(this.mapToBGM(dto));
            }
        }
        return bgms;
    }

    async findBGMsByIds(ids: string[]): Promise<BGM[]> {
        const bgms: BGM[] = [];
        for (const id of ids) {
            const bgm = await this.findBGMById(id);
            if (bgm) bgms.push(bgm);
        }
        return bgms;
    }

    async deleteBGM(id: string): Promise<void> {
        const loc = await this.findFileLocation(id);
        if (loc) await fileSystemService.deleteFile(loc.path);
    }

    async deleteBGMByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        for (const file of files) {
            const dto = await fileSystemService.readJson<FileSystemAsset>(
                path.join(dirPath, file)
            );
            if (dto && dto.type === "bgm") {
                await fileSystemService.deleteFile(path.join(dirPath, file));
            }
        }
    }

    // --- Playlists ---

    async savePlaylist(projectId: string, playlist: Playlist): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;

        const dto: FileSystemAsset = {
            id: playlist.id,
            projectId: projectId,
            type: "playlist",
            url: "", // Playlists don't have a single URL usually, or do they?
            storagePath: "",
            metadata: {},
            createdAt: playlist.createdAt.toISOString(),
            updatedAt: playlist.updatedAt.toISOString(),
            tracks: playlist.tracks,
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, playlist.id),
            dto
        );
    }

    async findPlaylistById(id: string): Promise<Playlist | null> {
        const loc = await this.findFileLocation(id);
        if (loc) {
            const dto = await fileSystemService.readJson<FileSystemAsset>(
                loc.path
            );
            if (dto && dto.type === "playlist") return this.mapToPlaylist(dto);
        }
        return null;
    }

    async findPlaylistsByProjectId(projectId: string): Promise<Playlist[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const playlists: Playlist[] = [];
        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto = await fileSystemService.readJson<FileSystemAsset>(
                    path.join(dirPath, file)
                );
                if (dto && dto.type === "playlist")
                    playlists.push(this.mapToPlaylist(dto));
            }
        }
        return playlists;
    }

    async findPlaylistsByIds(ids: string[]): Promise<Playlist[]> {
        const playlists: Playlist[] = [];
        for (const id of ids) {
            const pl = await this.findPlaylistById(id);
            if (pl) playlists.push(pl);
        }
        return playlists;
    }

    async deletePlaylist(id: string): Promise<void> {
        const loc = await this.findFileLocation(id);
        if (loc) await fileSystemService.deleteFile(loc.path);
    }

    async deletePlaylistsByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        for (const file of files) {
            const dto = await fileSystemService.readJson<FileSystemAsset>(
                path.join(dirPath, file)
            );
            if (dto && dto.type === "playlist") {
                await fileSystemService.deleteFile(path.join(dirPath, file));
            }
        }
    }

    // --- Helpers ---

    private async findOwnerIdByProjectId(
        projectId: string
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectPath = path.join(
                "users",
                user,
                "projects",
                `${projectId}.json`
            );
            if (await fileSystemService.exists(projectPath)) {
                return user;
            }
        }
        return null;
    }

    private async findFileLocation(
        assetId: string
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);
            for (const projectFile of projects) {
                if (projectFile.endsWith(".json")) {
                    const projectId = projectFile.replace(".json", "");
                    const assetPath = this.getFilePath(
                        user,
                        projectId,
                        assetId
                    );
                    if (await fileSystemService.exists(assetPath)) {
                        return { userId: user, projectId, path: assetPath };
                    }
                }
            }
        }
        return null;
    }

    private mapToImage(dto: FileSystemAsset): Image {
        return new Image(
            dto.id,
            dto.url,
            dto.storagePath,
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }

    private mapToBGM(dto: FileSystemAsset): BGM {
        const metadata = dto.metadata || {};
        return new BGM(
            dto.id,
            metadata.title || "Unknown Title",
            metadata.artist || "Unknown Artist",
            dto.url,
            dto.storagePath,
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }

    private mapToPlaylist(dto: FileSystemAsset): Playlist {
        const metadata = dto.metadata || {};
        return new Playlist(
            dto.id,
            metadata.name || "Unknown Playlist",
            metadata.description || "",
            metadata.tracks || [],
            dto.url,
            dto.storagePath,
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }
}
