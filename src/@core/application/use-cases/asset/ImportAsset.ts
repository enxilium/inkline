import { BGM, BGMSubjectType } from "../../../domain/entities/story/world/BGM";
import { Character } from "../../../domain/entities/story/world/Character";
import {
    Image,
    ImageSubjectType,
} from "../../../domain/entities/story/world/Image";
import {
    Playlist,
    PlaylistTrack,
} from "../../../domain/entities/story/world/Playlist";
import { Location } from "../../../domain/entities/story/world/Location";
import { Organization } from "../../../domain/entities/story/world/Organization";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

type ImageAssetPayload = {
    kind: "image";
    subjectType: ImageSubjectType;
    subjectId: string;
    fileData: ArrayBuffer;
    extension?: string;
};

type BgmAssetPayload = {
    kind: "bgm";
    subjectType: BGMSubjectType;
    subjectId: string;
    title: string;
    artist: string;
    fileData: ArrayBuffer;
    extension?: string;
};

type PlaylistAssetPayload = {
    kind: "playlist";
    name: string;
    description: string;
    tracks: PlaylistTrack[];
    url: string;
    subjectType?: "character" | "location" | "organization";
    subjectId?: string;
};

export type ImportAssetPayload =
    | ImageAssetPayload
    | BgmAssetPayload
    | PlaylistAssetPayload;

type PlaylistSubject =
    | { type: "character"; projectId: string; entity: Character }
    | { type: "location"; projectId: string; entity: Location }
    | { type: "organization"; projectId: string; entity: Organization };

type MusicSubject = PlaylistSubject;

export type ImportAssetResponse =
    | { kind: "image"; image: Image }
    | { kind: "bgm"; track: BGM }
    | { kind: "playlist"; playlist: Playlist };

export interface ImportAssetRequest {
    projectId: string;
    payload: ImportAssetPayload;
}

export class ImportAsset {
    constructor(
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(request: ImportAssetRequest): Promise<ImportAssetResponse> {
        const projectId = request.projectId.trim();
        if (!projectId) {
            throw new Error("Project ID is required to import an asset.");
        }

        switch (request.payload.kind) {
            case "image":
                return this.importImage(projectId, request.payload);
            case "bgm":
                return this.importBgm(projectId, request.payload);
            case "playlist":
                return this.importPlaylist(projectId, request.payload);
            default:
                throw new Error("Unsupported asset type.");
        }
    }

    private async importImage(
        projectId: string,
        payload: ImageAssetPayload
    ): Promise<{ kind: "image"; image: Image }> {
        const subjectId = await this.verifyImageSubject(
            projectId,
            payload.subjectType,
            payload.subjectId
        );

        const { scope, scopeId } = this.resolveImageScope(
            projectId,
            payload.subjectType,
            subjectId
        );
        const uploadResult = await this.storageService.uploadAsset(
            payload.fileData,
            {
                scope,
                scopeId,
                assetType: "image",
                extension: payload.extension,
            }
        );
        const now = new Date();
        const image = new Image(
            generateId(),
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveImage(projectId, image);
        await this.attachImageToSubject(
            projectId,
            payload.subjectType,
            subjectId,
            image
        );
        return { kind: "image", image };
    }

    private async attachImageToSubject(
        projectId: string,
        subjectType: ImageSubjectType,
        subjectId: string,
        image: Image
    ): Promise<void> {
        const timestamp = new Date();
        if (subjectType === "character") {
            const character =
                await this.characterRepository.findById(subjectId);
            if (character) {
                character.galleryImageIds.push(image.id);
                character.updatedAt = timestamp;
                await this.characterRepository.update(character);
            }
        } else if (subjectType === "location") {
            const location = await this.locationRepository.findById(subjectId);
            if (location) {
                location.galleryImageIds.push(image.id);
                location.updatedAt = timestamp;
                await this.locationRepository.update(location);
            }
        } else if (subjectType === "organization") {
            const organization =
                await this.organizationRepository.findById(subjectId);
            if (organization) {
                organization.galleryImageIds.push(image.id);
                organization.updatedAt = timestamp;
                await this.organizationRepository.update(organization);
            }
        } else if (subjectType === "cover") {
            const project = await this.projectRepository.findById(subjectId);
            if (project) {
                project.coverImageId = image.id;
                project.updatedAt = timestamp;
                await this.projectRepository.update(project);
            }
        }
    }

    private async importBgm(
        projectId: string,
        payload: BgmAssetPayload
    ): Promise<{ kind: "bgm"; track: BGM }> {
        const subject = await this.resolveMusicSubject(
            projectId,
            payload.subjectType,
            payload.subjectId
        );

        const previousTrack = await this.getExistingBgm(subject);

        const { scope, scopeId } = this.resolveMusicScope(
            payload.subjectType,
            payload.subjectId,
            projectId
        );
        const uploadResult = await this.storageService.uploadAsset(
            payload.fileData,
            {
                scope,
                scopeId,
                assetType: "bgm",
                extension: payload.extension,
            }
        );
        const now = new Date();
        const track = new BGM(
            generateId(),
            payload.title,
            payload.artist,
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveBGM(projectId, track);
        await this.applyBgmToSubject(subject, track, now);

        await this.deleteBgmAsset(subject.projectId, previousTrack);

        return { kind: "bgm", track };
    }

    private async importPlaylist(
        projectId: string,
        payload: PlaylistAssetPayload
    ): Promise<{ kind: "playlist"; playlist: Playlist }> {
        const subject = await this.resolvePlaylistSubject(
            projectId,
            payload.subjectType,
            payload.subjectId
        );
        const previousPlaylist = subject
            ? await this.getExistingPlaylist(subject)
            : null;
        const now = new Date();
        const playlist = new Playlist(
            generateId(),
            payload.name,
            payload.description,
            payload.tracks,
            payload.url,
            "",
            now,
            now
        );

        await this.assetRepository.savePlaylist(projectId, playlist);

        if (subject?.type === "character") {
            subject.entity.playlistId = playlist.id;
            subject.entity.updatedAt = now;
            await this.characterRepository.update(subject.entity);
        } else if (subject?.type === "location") {
            subject.entity.playlistId = playlist.id;
            subject.entity.updatedAt = now;
            await this.locationRepository.update(subject.entity);
        } else if (subject?.type === "organization") {
            subject.entity.playlistId = playlist.id;
            subject.entity.updatedAt = now;
            await this.organizationRepository.update(subject.entity);
        }

        await this.deletePlaylistAsset(
            subject?.projectId ?? projectId,
            previousPlaylist
        );

        return { kind: "playlist", playlist };
    }

    private async resolveMusicSubject(
        projectId: string,
        subjectType: BGMSubjectType,
        subjectId: string
    ): Promise<MusicSubject> {
        if (subjectType === "character") {
            return {
                type: "character",
                projectId,
                entity: await this.getCharacterForProject(projectId, subjectId),
            };
        }

        if (subjectType === "location") {
            return {
                type: "location",
                projectId,
                entity: await this.getLocationForProject(projectId, subjectId),
            };
        }

        const organization = await this.getOrganizationForProject(
            projectId,
            subjectId
        );
        return { type: "organization", projectId, entity: organization };
    }

    private async applyBgmToSubject(
        subject: MusicSubject,
        track: BGM,
        timestamp: Date
    ): Promise<void> {
        subject.entity.bgmId = track.id;
        subject.entity.updatedAt = timestamp;

        if (subject.type === "character") {
            await this.characterRepository.update(subject.entity);
        } else if (subject.type === "location") {
            await this.locationRepository.update(subject.entity);
        } else {
            await this.organizationRepository.update(subject.entity);
        }
    }

    private async getExistingBgm(subject: MusicSubject): Promise<BGM | null> {
        if (!subject.entity.bgmId) {
            return null;
        }

        return this.assetRepository.findBGMById(subject.entity.bgmId);
    }

    private async deleteBgmAsset(
        projectId: string,
        track: BGM | null
    ): Promise<void> {
        if (!track) {
            return;
        }

        await this.assetRepository.deleteBGM(track.id);
        await this.storageService.deleteFile(track.storagePath || track.url);
    }

    private async getExistingPlaylist(
        subject: PlaylistSubject
    ): Promise<Playlist | null> {
        if (!subject.entity.playlistId) {
            return null;
        }

        return this.assetRepository.findPlaylistById(subject.entity.playlistId);
    }

    private async deletePlaylistAsset(
        projectId: string,
        playlist: Playlist | null
    ): Promise<void> {
        if (!playlist) {
            return;
        }

        await this.assetRepository.deletePlaylist(playlist.id);
        const target = playlist.storagePath || playlist.url;
        if (target) {
            await this.storageService.deleteFile(target);
        }
    }

    private async verifyImageSubject(
        projectId: string,
        subjectType: ImageSubjectType,
        subjectId: string
    ): Promise<string> {
        const normalizedSubjectId = subjectId?.trim() ?? "";

        if (subjectType === "character") {
            await this.getCharacterForProject(projectId, normalizedSubjectId);
            return normalizedSubjectId;
        }

        if (subjectType === "location") {
            await this.getLocationForProject(projectId, normalizedSubjectId);
            return normalizedSubjectId;
        }

        if (subjectType === "organization") {
            await this.getOrganizationForProject(
                projectId,
                normalizedSubjectId
            );
            return normalizedSubjectId;
        }

        if (subjectType === "chapter") {
            if (!normalizedSubjectId) {
                throw new Error("Chapter ID is required for chapter images.");
            }
            const chapter =
                await this.chapterRepository.findById(normalizedSubjectId);
            if (!chapter) {
                throw new Error("Chapter image references an unknown chapter.");
            }
            return normalizedSubjectId;
        }

        if (subjectType === "cover" || subjectType === "misc") {
            if (normalizedSubjectId && normalizedSubjectId !== projectId) {
                throw new Error(
                    "Project-level images must target their owning project."
                );
            }
            return projectId;
        }

        throw new Error("Unsupported image subject type supplied.");
    }

    private async resolvePlaylistSubject(
        projectId: string,
        subjectType?: "character" | "location" | "organization",
        subjectId?: string
    ): Promise<PlaylistSubject | null> {
        if (!subjectType && !subjectId) {
            return null;
        }

        if (!subjectType || !subjectId?.trim()) {
            throw new Error(
                "Playlist subject type and ID must both be provided when linking."
            );
        }

        const normalized = subjectId.trim();

        if (subjectType === "character") {
            const entity = await this.getCharacterForProject(
                projectId,
                normalized
            );
            return { type: "character", projectId, entity };
        }

        if (subjectType === "location") {
            const entity = await this.getLocationForProject(
                projectId,
                normalized
            );
            return { type: "location", projectId, entity };
        }

        if (subjectType === "organization") {
            const entity = await this.getOrganizationForProject(
                projectId,
                normalized
            );
            return { type: "organization", projectId, entity };
        }

        throw new Error("Unsupported playlist subject type supplied.");
    }

    private resolveImageScope(
        projectId: string,
        subjectType: ImageSubjectType,
        subjectId: string
    ) {
        switch (subjectType) {
            case "character":
                return { scope: "character" as const, scopeId: subjectId };
            case "location":
                return { scope: "location" as const, scopeId: subjectId };
            case "organization":
                return { scope: "organization" as const, scopeId: subjectId };
            case "chapter":
                return { scope: "chapter" as const, scopeId: subjectId };
            case "cover":
            case "misc":
                return { scope: "project" as const, scopeId: projectId };
            default:
                return { scope: "project" as const, scopeId: projectId };
        }
    }

    private resolveMusicScope(
        subjectType: BGMSubjectType,
        subjectId: string,
        projectId: string
    ) {
        if (subjectType === "character") {
            return { scope: "character" as const, scopeId: subjectId };
        }
        if (subjectType === "location") {
            return { scope: "location" as const, scopeId: subjectId };
        }
        if (subjectType === "organization") {
            return { scope: "organization" as const, scopeId: subjectId };
        }
        return { scope: "project" as const, scopeId: projectId };
    }

    private async getCharacterForProject(
        projectId: string,
        characterId: string
    ): Promise<Character> {
        const normalized = characterId.trim();
        const character = await this.characterRepository.findById(normalized);
        if (!character) {
            throw new Error("Character not found for this project.");
        }

        return character;
    }

    private async getLocationForProject(
        projectId: string,
        locationId: string
    ): Promise<Location> {
        const normalized = locationId.trim();
        const location = await this.locationRepository.findById(normalized);
        if (!location) {
            throw new Error("Location not found for this project.");
        }

        return location;
    }

    private async getOrganizationForProject(
        projectId: string,
        organizationId: string
    ): Promise<Organization> {
        const normalized = organizationId.trim();
        const organization =
            await this.organizationRepository.findById(normalized);
        if (!organization) {
            throw new Error("Organization not found for this project.");
        }

        return organization;
    }
}
