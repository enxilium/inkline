import { Character } from "../../../domain/entities/story/world/Character";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IStorageService } from "../../../domain/services/IStorageService";

export interface DeleteCharacterRequest {
    projectId: string;
    characterId: string;
}

export class DeleteCharacter {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService
    ) {}

    async execute(request: DeleteCharacterRequest): Promise<void> {
        const projectId = request.projectId.trim();
        const characterId = request.characterId.trim();

        if (!projectId || !characterId) {
            throw new Error("Project ID and Character ID are required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const character = await this.characterRepository.findById(characterId);
        if (!character) {
            throw new Error("Character not found for this project.");
        }

        // 1. Detach from Project (Parent)
        if (project.characterIds.includes(characterId)) {
            project.characterIds = project.characterIds.filter(
                (id) => id !== characterId
            );
            project.updatedAt = new Date();
            await this.projectRepository.update(project);
        }

        // 2. Detach from Locations (Dependents)
        await this.detachFromLocations(projectId, character);

        // 3. Delete Assets (Children)
        await this.deleteCharacterAssets(projectId, character);

        // 4. Delete Character (Self)
        await this.characterRepository.delete(characterId);
    }

    private async deleteCharacterAssets(
        projectId: string,
        character: Character
    ): Promise<void> {
        await Promise.all([
            this.deleteGalleryImages(character.galleryImageIds, projectId),
            this.deleteBgmAsset(character.bgmId, projectId),
            this.deletePlaylistAsset(character.playlistId, projectId),
        ]);
    }

    private async detachFromLocations(
        projectId: string,
        character: Character
    ): Promise<void> {
        const locationIds = [
            character.currentLocationId,
            character.backgroundLocationId,
        ].filter((id): id is string => !!id);

        const updates = locationIds.map(async (locationId) => {
            const location = await this.locationRepository.findById(locationId);
            if (!location) {
                return;
            }

            if (!location.characterIds.includes(character.id)) {
                return;
            }

            location.characterIds = location.characterIds.filter(
                (id) => id !== character.id
            );
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        });

        await Promise.all(updates);
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
