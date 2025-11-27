import { BGM, BGMSubjectType } from "../entities/story/world/BGM";
import { Image, ImageSubjectType } from "../entities/story/world/Image";
import {
    Playlist,
    PlaylistSubjectType,
} from "../entities/story/world/Playlist";
import { Voice } from "../entities/story/world/Voice";

export interface IAssetRepository {
    // Images
    saveImage(
        projectId: string,
        subjectType: ImageSubjectType,
        subjectId: string,
        image: Image
    ): Promise<void>;
    findImageById(projectId: string, id: string): Promise<Image | null>;
    findImagesByProjectId(projectId: string): Promise<Image[]>;
    findImagesByIds(projectId: string, ids: string[]): Promise<Image[]>;
    deleteImage(projectId: string, id: string): Promise<void>;
    deleteImagesByProjectId(projectId: string): Promise<void>;

    // Voices
    saveVoice(
        projectId: string,
        characterId: string,
        voice: Voice
    ): Promise<void>;
    findVoiceById(projectId: string, id: string): Promise<Voice | null>;
    findVoicesByProjectId(projectId: string): Promise<Voice[]>;
    findVoicesByIds(projectId: string, ids: string[]): Promise<Voice[]>;
    deleteVoice(projectId: string, id: string): Promise<void>;
    deleteVoicesByProjectId(projectId: string): Promise<void>;

    // BGM
    saveBGM(
        projectId: string,
        subjectType: BGMSubjectType,
        subjectId: string,
        bgm: BGM
    ): Promise<void>;
    findBGMById(projectId: string, id: string): Promise<BGM | null>;
    findBGMByProjectId(projectId: string): Promise<BGM[]>;
    findBGMsByIds(projectId: string, ids: string[]): Promise<BGM[]>;
    deleteBGM(projectId: string, id: string): Promise<void>;
    deleteBGMByProjectId(projectId: string): Promise<void>;

    // Playlists
    savePlaylist(
        projectId: string,
        subjectType: PlaylistSubjectType | null,
        subjectId: string | null,
        playlist: Playlist
    ): Promise<void>;
    findPlaylistById(projectId: string, id: string): Promise<Playlist | null>;
    findPlaylistsByProjectId(projectId: string): Promise<Playlist[]>;
    findPlaylistsByIds(projectId: string, ids: string[]): Promise<Playlist[]>;
    deletePlaylist(projectId: string, id: string): Promise<void>;
    deletePlaylistsByProjectId(projectId: string): Promise<void>;
}
