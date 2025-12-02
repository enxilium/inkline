import { BGM, BGMSubjectType } from "../entities/story/world/BGM";
import { Image, ImageSubjectType } from "../entities/story/world/Image";
import {
    Playlist,
    PlaylistSubjectType,
} from "../entities/story/world/Playlist";

export interface IAssetRepository {
    // Images
    saveImage(
        projectId: string,
        subjectType: ImageSubjectType,
        subjectId: string,
        image: Image
    ): Promise<void>;
    findImageById(id: string): Promise<Image | null>;
    findImagesByProjectId(projectId: string): Promise<Image[]>;
    findImagesByIds(ids: string[]): Promise<Image[]>;
    deleteImage(id: string): Promise<void>;
    deleteImagesByProjectId(projectId: string): Promise<void>;

    // BGM
    saveBGM(
        projectId: string,
        subjectType: BGMSubjectType,
        subjectId: string,
        bgm: BGM
    ): Promise<void>;
    findBGMById(id: string): Promise<BGM | null>;
    findBGMByProjectId(projectId: string): Promise<BGM[]>;
    findBGMsByIds(ids: string[]): Promise<BGM[]>;
    deleteBGM(id: string): Promise<void>;
    deleteBGMByProjectId(projectId: string): Promise<void>;

    // Playlists
    savePlaylist(
        projectId: string,
        subjectType: PlaylistSubjectType | null,
        subjectId: string | null,
        playlist: Playlist
    ): Promise<void>;
    findPlaylistById(id: string): Promise<Playlist | null>;
    findPlaylistsByProjectId(projectId: string): Promise<Playlist[]>;
    findPlaylistsByIds(ids: string[]): Promise<Playlist[]>;
    deletePlaylist(id: string): Promise<void>;
    deletePlaylistsByProjectId(projectId: string): Promise<void>;
}
