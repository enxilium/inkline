import { IAssetRepository } from "../../@core/domain/repositories/IAssetRepository";
import {
    Image,
    ImageSubjectType,
} from "../../@core/domain/entities/story/world/Image";
import { Voice } from "../../@core/domain/entities/story/world/Voice";
import {
    BGM,
    BGMSubjectType,
} from "../../@core/domain/entities/story/world/BGM";
import {
    Playlist,
    PlaylistSubjectType,
    PlaylistTrack,
} from "../../@core/domain/entities/story/world/Playlist";
import { SupabaseService } from "./SupabaseService";
import { SupabaseStorageService } from "../storage/SupabaseStorageService";

type AssetType = "image" | "voice" | "bgm" | "playlist";

type AssetRow = {
    id: string;
    project_id: string;
    type: AssetType;
    subject_type: string | null;
    subject_id: string | null;
    url: string;
    storage_path: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
};

const asString = (value: unknown, fallback = ""): string =>
    typeof value === "string" ? value : fallback;

const asOptionalString = (value: unknown): string | undefined =>
    typeof value === "string" && value.length > 0 ? value : undefined;

const asPlaylistTracks = (value: unknown): PlaylistTrack[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }
            const candidate = entry as Record<string, unknown>;
            const id = asString(candidate.id);
            const title = asString(candidate.title);
            const artist = asString(candidate.artist);
            const url = asString(candidate.url);
            const duration =
                typeof candidate.durationSeconds === "number"
                    ? candidate.durationSeconds
                    : 0;

            if (!id || !title || !artist || !url) {
                return null;
            }

            const album = asOptionalString(candidate.album);
            const track: PlaylistTrack = {
                id,
                title,
                artist,
                url,
                durationSeconds: duration,
            };

            if (album) {
                track.album = album;
            }

            return track;
        })
        .filter((track): track is PlaylistTrack => track !== null);
};

const storageService = new SupabaseStorageService();

const resolveAssetUrl = (row: AssetRow): string => {
    const storedUrl = (row.url || "").trim();
    if (storedUrl.startsWith("http")) {
        return storedUrl;
    }

    const pathCandidate = (row.storage_path || storedUrl).trim();
    if (!pathCandidate) {
        return storedUrl;
    }

    return storageService.getUrl(pathCandidate);
};

const mapRowToImage = (row: AssetRow): Image =>
    new Image(
        row.id,
        resolveAssetUrl(row),
        row.storage_path,
        new Date(row.created_at),
        new Date(row.updated_at)
    );

const mapRowToVoice = (row: AssetRow): Voice =>
    new Voice(
        row.id,
        resolveAssetUrl(row),
        row.storage_path,
        new Date(row.created_at),
        new Date(row.updated_at)
    );

const mapRowToBGM = (row: AssetRow): BGM => {
    const metadata = row.metadata || {};
    return new BGM(
        row.id,
        asString(metadata["title"], "Untitled"),
        asString(metadata["artist"], "Unknown"),
        resolveAssetUrl(row),
        row.storage_path,
        new Date(row.created_at),
        new Date(row.updated_at)
    );
};

const mapRowToPlaylist = (row: AssetRow): Playlist => {
    const metadata = row.metadata || {};
    return new Playlist(
        row.id,
        asString(metadata["name"], "Untitled Playlist"),
        asString(metadata["description"], ""),
        asPlaylistTracks(metadata["tracks"]),
        resolveAssetUrl(row),
        row.storage_path,
        new Date(row.created_at),
        new Date(row.updated_at)
    );
};

export class SupabaseAssetRepository implements IAssetRepository {
    async saveImage(
        projectId: string,
        subjectType: ImageSubjectType,
        subjectId: string,
        image: Image
    ): Promise<void> {
        await this.upsertAsset({
            id: image.id,
            project_id: projectId,
            type: "image",
            subject_type: subjectType,
            subject_id: subjectId,
            url: image.url,
            storage_path: image.storagePath,
            metadata: {
                subjectType,
                subjectId,
            },
            created_at: image.createdAt.toISOString(),
            updated_at: image.updatedAt.toISOString(),
        });
    }

    async findImageById(projectId: string, id: string): Promise<Image | null> {
        const row = await this.findAssetRow(projectId, id, "image");
        return row ? mapRowToImage(row) : null;
    }

    async findImagesByProjectId(projectId: string): Promise<Image[]> {
        const rows = await this.findAssetsByProject(projectId, "image");
        return rows.map(mapRowToImage);
    }

    async findImagesByIds(projectId: string, ids: string[]): Promise<Image[]> {
        if (!ids.length) {
            return [];
        }
        const rows = await this.findAssetsByIds(projectId, "image", ids);
        return rows.map(mapRowToImage);
    }

    async deleteImage(projectId: string, id: string): Promise<void> {
        await this.deleteAsset(projectId, id, "image");
    }

    async deleteImagesByProjectId(projectId: string): Promise<void> {
        await this.deleteAssetsByProject(projectId, "image");
    }

    async saveVoice(
        projectId: string,
        characterId: string,
        voice: Voice
    ): Promise<void> {
        await this.upsertAsset({
            id: voice.id,
            project_id: projectId,
            type: "voice",
            subject_type: "character",
            subject_id: characterId,
            url: voice.url,
            storage_path: voice.storagePath,
            metadata: {
                characterId,
            },
            created_at: voice.createdAt.toISOString(),
            updated_at: voice.updatedAt.toISOString(),
        });
    }

    async findVoiceById(projectId: string, id: string): Promise<Voice | null> {
        const row = await this.findAssetRow(projectId, id, "voice");
        return row ? mapRowToVoice(row) : null;
    }

    async findVoicesByProjectId(projectId: string): Promise<Voice[]> {
        const rows = await this.findAssetsByProject(projectId, "voice");
        return rows.map(mapRowToVoice);
    }

    async findVoicesByIds(projectId: string, ids: string[]): Promise<Voice[]> {
        if (!ids.length) {
            return [];
        }
        const rows = await this.findAssetsByIds(projectId, "voice", ids);
        return rows.map(mapRowToVoice);
    }

    async deleteVoice(projectId: string, id: string): Promise<void> {
        await this.deleteAsset(projectId, id, "voice");
    }

    async deleteVoicesByProjectId(projectId: string): Promise<void> {
        await this.deleteAssetsByProject(projectId, "voice");
    }

    async saveBGM(
        projectId: string,
        subjectType: BGMSubjectType,
        subjectId: string,
        bgm: BGM
    ): Promise<void> {
        await this.upsertAsset({
            id: bgm.id,
            project_id: projectId,
            type: "bgm",
            subject_type: subjectType,
            subject_id: subjectId,
            url: bgm.url,
            storage_path: bgm.storagePath,
            metadata: {
                title: bgm.title,
                artist: bgm.artist,
            },
            created_at: bgm.createdAt.toISOString(),
            updated_at: bgm.updatedAt.toISOString(),
        });
    }

    async findBGMById(projectId: string, id: string): Promise<BGM | null> {
        const row = await this.findAssetRow(projectId, id, "bgm");
        return row ? mapRowToBGM(row) : null;
    }

    async findBGMByProjectId(projectId: string): Promise<BGM[]> {
        const rows = await this.findAssetsByProject(projectId, "bgm");
        return rows.map(mapRowToBGM);
    }

    async findBGMsByIds(projectId: string, ids: string[]): Promise<BGM[]> {
        if (!ids.length) {
            return [];
        }
        const rows = await this.findAssetsByIds(projectId, "bgm", ids);
        return rows.map(mapRowToBGM);
    }

    async deleteBGM(projectId: string, id: string): Promise<void> {
        await this.deleteAsset(projectId, id, "bgm");
    }

    async deleteBGMByProjectId(projectId: string): Promise<void> {
        await this.deleteAssetsByProject(projectId, "bgm");
    }

    async savePlaylist(
        projectId: string,
        subjectType: PlaylistSubjectType | null,
        subjectId: string | null,
        playlist: Playlist
    ): Promise<void> {
        await this.upsertAsset({
            id: playlist.id,
            project_id: projectId,
            type: "playlist",
            subject_type: subjectType,
            subject_id: subjectId,
            url: playlist.url,
            storage_path: playlist.storagePath,
            metadata: {
                name: playlist.name,
                description: playlist.description,
                tracks: playlist.tracks,
            },
            created_at: playlist.createdAt.toISOString(),
            updated_at: playlist.updatedAt.toISOString(),
        });
    }

    async findPlaylistById(
        projectId: string,
        id: string
    ): Promise<Playlist | null> {
        const row = await this.findAssetRow(projectId, id, "playlist");
        return row ? mapRowToPlaylist(row) : null;
    }

    async findPlaylistsByProjectId(projectId: string): Promise<Playlist[]> {
        const rows = await this.findAssetsByProject(projectId, "playlist");
        return rows.map(mapRowToPlaylist);
    }

    async findPlaylistsByIds(
        projectId: string,
        ids: string[]
    ): Promise<Playlist[]> {
        if (!ids.length) {
            return [];
        }
        const rows = await this.findAssetsByIds(projectId, "playlist", ids);
        return rows.map(mapRowToPlaylist);
    }

    async deletePlaylist(projectId: string, id: string): Promise<void> {
        await this.deleteAsset(projectId, id, "playlist");
    }

    async deletePlaylistsByProjectId(projectId: string): Promise<void> {
        await this.deleteAssetsByProject(projectId, "playlist");
    }

    private async upsertAsset(payload: {
        id: string;
        project_id: string;
        type: AssetType;
        subject_type: string | null;
        subject_id: string | null;
        url: string;
        storage_path: string;
        metadata: Record<string, unknown>;
        created_at: string;
        updated_at: string;
    }): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("assets")
            .upsert(payload, { onConflict: "id" });

        if (error) throw new Error(error.message);
    }

    private async findAssetRow(
        projectId: string,
        id: string,
        type: AssetType
    ): Promise<AssetRow | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("assets")
            .select("*")
            .eq("id", id)
            .eq("project_id", projectId)
            .eq("type", type)
            .single();

        if (error || !data) return null;

        return data as AssetRow;
    }

    private async findAssetsByProject(
        projectId: string,
        type: AssetType
    ): Promise<AssetRow[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("assets")
            .select("*")
            .eq("project_id", projectId)
            .eq("type", type)
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return data as AssetRow[];
    }

    private async findAssetsByIds(
        projectId: string,
        type: AssetType,
        ids: string[]
    ): Promise<AssetRow[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("assets")
            .select("*")
            .eq("project_id", projectId)
            .eq("type", type)
            .in("id", ids)
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return data as AssetRow[];
    }

    private async deleteAsset(
        projectId: string,
        id: string,
        type: AssetType
    ): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("assets")
            .delete()
            .eq("id", id)
            .eq("project_id", projectId)
            .eq("type", type);

        if (error) throw new Error(error.message);
    }

    private async deleteAssetsByProject(
        projectId: string,
        type: AssetType
    ): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("assets")
            .delete()
            .eq("project_id", projectId)
            .eq("type", type);

        if (error) throw new Error(error.message);
    }
}
