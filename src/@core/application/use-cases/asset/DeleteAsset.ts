import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IStorageService } from "../../../domain/services/IStorageService";

export type AssetKind = "image" | "bgm" | "playlist";

export interface DeleteAssetRequest {
    projectId: string;
    assetId: string;
    kind: AssetKind;
}

export class DeleteAsset {
    constructor(
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository
    ) {}

    async execute(request: DeleteAssetRequest): Promise<void> {
        const { projectId, assetId, kind } = request;

        if (!projectId.trim() || !assetId.trim()) {
            throw new Error("Project ID and Asset ID are required.");
        }

        switch (kind) {
            case "image":
                await this.deleteImage(projectId, assetId);
                break;
            case "bgm":
                await this.deleteBgm(projectId, assetId);
                break;
            case "playlist":
                await this.deletePlaylist(projectId, assetId);
                break;
            default:
                throw new Error("Unsupported asset type.");
        }
    }

    private async deleteImage(
        projectId: string,
        assetId: string
    ): Promise<void> {
        const image = await this.assetRepository.findImageById(assetId);
        if (!image) {
            throw new Error("Image asset not found for this project.");
        }

        // 1. Detach from Dependents
        const timestamp = new Date();
        const [characters, locations, organizations] = await Promise.all([
            this.characterRepository.findByProjectId(projectId),
            this.locationRepository.findByProjectId(projectId),
            this.organizationRepository.findByProjectId(projectId),
        ]);

        await Promise.all([
            ...characters
                .filter((character) =>
                    character.galleryImageIds.includes(assetId)
                )
                .map((character) => {
                    character.galleryImageIds =
                        character.galleryImageIds.filter(
                            (existingId) => existingId !== assetId
                        );
                    character.updatedAt = timestamp;
                    return this.characterRepository.update(character);
                }),
            ...locations
                .filter((location) =>
                    location.galleryImageIds.includes(assetId)
                )
                .map((location) => {
                    location.galleryImageIds = location.galleryImageIds.filter(
                        (existingId) => existingId !== assetId
                    );
                    location.updatedAt = timestamp;
                    return this.locationRepository.update(location);
                }),
            ...organizations
                .filter((organization) =>
                    organization.galleryImageIds.includes(assetId)
                )
                .map((organization) => {
                    organization.galleryImageIds =
                        organization.galleryImageIds.filter(
                            (existingId) => existingId !== assetId
                        );
                    organization.updatedAt = timestamp;
                    return this.organizationRepository.update(organization);
                }),
        ]);

        // 2. Delete Asset (Self)
        await this.assetRepository.deleteImage(assetId);

        // 3. Delete File (Storage)
        await this.storageService.deleteFile(image.storagePath || image.url);
    }

    private async deleteBgm(projectId: string, assetId: string): Promise<void> {
        const track = await this.assetRepository.findBGMById(assetId);
        if (!track) {
            throw new Error("BGM asset not found for this project.");
        }

        // 1. Detach from Dependents
        const timestamp = new Date();
        const [characters, locations, organizations] = await Promise.all([
            this.characterRepository.findByProjectId(projectId),
            this.locationRepository.findByProjectId(projectId),
            this.organizationRepository.findByProjectId(projectId),
        ]);

        await Promise.all([
            ...characters
                .filter((character) => character.bgmId === assetId)
                .map((character) => {
                    character.bgmId = null;
                    character.updatedAt = timestamp;
                    return this.characterRepository.update(character);
                }),
            ...locations
                .filter((location) => location.bgmId === assetId)
                .map((location) => {
                    location.bgmId = null;
                    location.updatedAt = timestamp;
                    return this.locationRepository.update(location);
                }),
            ...organizations
                .filter((organization) => organization.bgmId === assetId)
                .map((organization) => {
                    organization.bgmId = null;
                    organization.updatedAt = timestamp;
                    return this.organizationRepository.update(organization);
                }),
        ]);

        // 2. Delete Asset (Self)
        await this.assetRepository.deleteBGM(assetId);

        // 3. Delete File (Storage)
        await this.storageService.deleteFile(track.storagePath || track.url);
    }

    private async deletePlaylist(
        projectId: string,
        assetId: string
    ): Promise<void> {
        const playlist = await this.assetRepository.findPlaylistById(assetId);
        if (!playlist) {
            throw new Error("Playlist asset not found for this project.");
        }

        // 1. Detach from Dependents
        const [characters, locations, organizations] = await Promise.all([
            this.characterRepository.findByProjectId(projectId),
            this.locationRepository.findByProjectId(projectId),
            this.organizationRepository.findByProjectId(projectId),
        ]);

        await Promise.all(
            characters
                .filter((character) => character.playlistId === assetId)
                .map((character) => {
                    character.playlistId = null;
                    character.updatedAt = new Date();
                    return this.characterRepository.update(character);
                })
        );

        await Promise.all(
            locations
                .filter((location) => location.playlistId === assetId)
                .map((location) => {
                    location.playlistId = null;
                    location.updatedAt = new Date();
                    return this.locationRepository.update(location);
                })
        );

        await Promise.all(
            organizations
                .filter((organization) => organization.playlistId === assetId)
                .map((organization) => {
                    organization.playlistId = null;
                    organization.updatedAt = new Date();
                    return this.organizationRepository.update(organization);
                })
        );

        // 2. Delete Asset (Self)
        await this.assetRepository.deletePlaylist(assetId);

        // 3. Delete File (Storage)
        if (playlist.storagePath) {
            await this.storageService.deleteFile(playlist.storagePath);
        }
    }
}
