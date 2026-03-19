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
        private readonly storageService: IStorageService,
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

        const projectLocations =
            await this.locationRepository.findByProjectId(projectId);
        const locationsById = new Map(
            projectLocations.map((entry) => [entry.id, entry]),
        );

        const subtreeIds = this.collectSubtreeIds(locationId, locationsById);
        const subtreeIdSet = new Set(subtreeIds);

        // Detach subtree from root list.
        project.locationIds = project.locationIds.filter(
            (id) => !subtreeIdSet.has(id),
        );

        // Detach subtree from all parent location references.
        const parentUpdates: Promise<void>[] = [];
        for (const existingLocation of projectLocations) {
            if (subtreeIdSet.has(existingLocation.id)) {
                continue;
            }

            const nextChildren = existingLocation.sublocationIds.filter(
                (childId) => !subtreeIdSet.has(childId),
            );
            if (
                nextChildren.length !== existingLocation.sublocationIds.length
            ) {
                existingLocation.sublocationIds = nextChildren;
                existingLocation.updatedAt = new Date();
                parentUpdates.push(
                    this.locationRepository.update(existingLocation),
                );
            }
        }
        await Promise.all(parentUpdates);

        project.updatedAt = new Date();
        await this.projectRepository.update(project);

        const characters =
            await this.characterRepository.findByProjectId(projectId);

        // 2. Detach from Characters (Dependents)
        const characterUpdates = characters
            .filter(
                (character) =>
                    (character.currentLocationId !== null &&
                        subtreeIdSet.has(character.currentLocationId)) ||
                    (character.backgroundLocationId !== null &&
                        subtreeIdSet.has(character.backgroundLocationId)),
            )
            .map((character) => {
                if (
                    character.currentLocationId &&
                    subtreeIdSet.has(character.currentLocationId)
                ) {
                    character.currentLocationId = null;
                }
                if (
                    character.backgroundLocationId &&
                    subtreeIdSet.has(character.backgroundLocationId)
                ) {
                    character.backgroundLocationId = null;
                }
                character.updatedAt = new Date();
                return this.characterRepository.update(character);
            });
        await Promise.all(characterUpdates);

        // 3. Detach from Organizations (Dependents)
        const organizations =
            await this.organizationRepository.findByProjectId(projectId);
        const organizationUpdates = organizations.map((organization) => {
            const nextLocationIds = organization.locationIds.filter(
                (id) => id !== locationId,
            );
            const filteredLocationIds = nextLocationIds.filter(
                (id) => !subtreeIdSet.has(id),
            );
            if (
                filteredLocationIds.length === organization.locationIds.length
            ) {
                return null;
            }
            organization.locationIds = filteredLocationIds;
            organization.updatedAt = new Date();
            return this.organizationRepository.update(organization);
        });
        await Promise.all(
            organizationUpdates.filter(
                (update): update is Promise<void> => update !== null,
            ),
        );

        // 4. Delete Assets + Locations (subtree)
        for (const subtreeLocationId of subtreeIds) {
            const subtreeLocation = locationsById.get(subtreeLocationId);
            if (!subtreeLocation) {
                continue;
            }
            await this.deleteLocationAssets(subtreeLocation);
            await this.locationRepository.delete(subtreeLocationId);
        }
    }

    private collectSubtreeIds(
        rootLocationId: string,
        locationsById: Map<string, Location>,
    ): string[] {
        const collected: string[] = [];
        const visited = new Set<string>();

        const visit = (locationId: string) => {
            if (visited.has(locationId)) {
                return;
            }

            visited.add(locationId);
            const location = locationsById.get(locationId);
            if (!location) {
                return;
            }

            location.sublocationIds.forEach((childId) => visit(childId));
            collected.push(locationId);
        };

        visit(rootLocationId);
        return collected;
    }

    private async deleteLocationAssets(location: Location): Promise<void> {
        await Promise.all([
            this.deleteGalleryImages(location.galleryImageIds),
            this.deleteBgmAsset(location.bgmId),
            this.deletePlaylistAsset(location.playlistId),
        ]);
    }

    private async deleteGalleryImages(imageIds: string[]): Promise<void> {
        const deletions = imageIds.map(async (imageId) => {
            const image = await this.assetRepository.findImageById(imageId);
            if (!image) {
                return;
            }

            await this.assetRepository.deleteImage(imageId);
            await this.storageService.deleteFile(
                image.storagePath || image.url,
            );
        });

        await Promise.all(deletions);
    }

    private async deleteBgmAsset(bgmId: string | null): Promise<void> {
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
