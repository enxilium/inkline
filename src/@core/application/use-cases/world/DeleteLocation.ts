import { Location } from "../../../domain/entities/story/world/Location";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IStorageService } from "../../../domain/services/IStorageService";

export interface DeleteLocationRequest {
    projectId: string;
    locationId: string;
}

export class DeleteLocation {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly organizationRepository: IOrganizationRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService
    ) {}

    async execute(request: DeleteLocationRequest): Promise<void> {
        const projectId = request.projectId.trim();
        const locationId = request.locationId.trim();

        if (!projectId || !locationId) {
            throw new Error("Project ID and Location ID are required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            throw new Error("Location not found for this project.");
        }

        // 1. Detach from Project (Parent)
        if (project.locationIds.includes(locationId)) {
            project.locationIds = project.locationIds.filter(
                (id) => id !== locationId
            );
            project.updatedAt = new Date();
            await this.projectRepository.update(project);
        }

        const characters =
            await this.characterRepository.findByProjectId(projectId);

        // 2. Detach from Characters (Dependents)
        const characterUpdates = characters
            .filter(
                (character) =>
                    character.currentLocationId === locationId ||
                    character.backgroundLocationId === locationId
            )
            .map((character) => {
                if (character.currentLocationId === locationId) {
                    character.currentLocationId = null;
                }
                if (character.backgroundLocationId === locationId) {
                    character.backgroundLocationId = null;
                }
                character.updatedAt = new Date();
                return this.characterRepository.update(character);
            });
        await Promise.all(characterUpdates);

        // 3. Detach from Organizations (Dependents)
        const organizations =
            await this.organizationRepository.findByLocationId(locationId);
        const organizationUpdates = organizations.map((organization) => {
            organization.locationIds = organization.locationIds.filter(
                (id) => id !== locationId
            );
            organization.updatedAt = new Date();
            return this.organizationRepository.update(organization);
        });
        await Promise.all(organizationUpdates);

        // 4. Delete Assets (Children)
        await this.deleteLocationAssets(projectId, location);

        // 5. Delete Location (Self)
        await this.locationRepository.delete(locationId);
    }

    private async deleteLocationAssets(
        projectId: string,
        location: Location
    ): Promise<void> {
        await Promise.all([
            this.deleteGalleryImages(location.galleryImageIds, projectId),
            this.deleteBgmAsset(location.bgmId, projectId),
            this.deletePlaylistAsset(location.playlistId, projectId),
        ]);
    }

    private async deleteGalleryImages(
        imageIds: string[],
        projectId: string
    ): Promise<void> {
        const deletions = imageIds.map(async (imageId) => {
            const image = await this.assetRepository.findImageById(imageId);
            if (!image) {
                return;
            }

            await this.assetRepository.deleteImage(imageId);
            await this.storageService.deleteFile(
                image.storagePath || image.url
            );
        });

        await Promise.all(deletions);
    }

    private async deleteBgmAsset(
        bgmId: string | null,
        projectId: string
    ): Promise<void> {
        if (!bgmId) {
            return;
        }

        const track = await this.assetRepository.findBGMById(bgmId);
        if (!track) {
            return;
        }

        await this.assetRepository.deleteBGM(bgmId);
        await this.storageService.deleteFile(track.storagePath || track.url);
    }

    private async deletePlaylistAsset(
        playlistId: string | null,
        projectId: string
    ): Promise<void> {
        if (!playlistId) {
            return;
        }

        const playlist =
            await this.assetRepository.findPlaylistById(playlistId);
        if (!playlist) {
            return;
        }

        await this.assetRepository.deletePlaylist(playlistId);
        const target = playlist.storagePath || playlist.url;
        if (target) {
            await this.storageService.deleteFile(target);
        }
    }
}
