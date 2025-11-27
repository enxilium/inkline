import { Organization } from "../../../domain/entities/story/world/Organization";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IStorageService } from "../../../domain/services/IStorageService";

export interface DeleteOrganizationRequest {
    projectId: string;
    organizationId: string;
}

export class DeleteOrganization {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService
    ) {}

    async execute(request: DeleteOrganizationRequest): Promise<void> {
        const projectId = request.projectId.trim();
        const organizationId = request.organizationId.trim();

        if (!projectId || !organizationId) {
            throw new Error("Project ID and Organization ID are required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const organization = await this.organizationRepository.findById(
            projectId,
            organizationId
        );
        if (!organization) {
            throw new Error("Organization not found for this project.");
        }

        // 1. Detach from Project (Parent)
        if (project.organizationIds.includes(organizationId)) {
            project.organizationIds = project.organizationIds.filter(
                (id) => id !== organizationId
            );
            project.updatedAt = new Date();
            await this.projectRepository.update(project);
        }

        // 2. Detach from Characters (Dependents)
        await this.detachCharactersFromOrganization(projectId, organizationId);

        // 3. Detach from Locations (Dependents)
        await this.detachLocationsFromOrganization(projectId, organization);

        // 4. Delete Assets (Children)
        await this.deleteOrganizationAssets(projectId, organization);

        // 5. Delete Organization (Self)
        await this.organizationRepository.delete(projectId, organizationId);
    }

    private async detachCharactersFromOrganization(
        projectId: string,
        organizationId: string
    ): Promise<void> {
        const characters =
            await this.characterRepository.findByProjectId(projectId);
        const updates = characters
            .filter((character) => character.organizationId === organizationId)
            .map((character) => {
                character.organizationId = null;
                character.updatedAt = new Date();
                return this.characterRepository.update(projectId, character);
            });

        await Promise.all(updates);
    }

    private async detachLocationsFromOrganization(
        projectId: string,
        organization: Organization
    ): Promise<void> {
        const detachments = organization.locationIds.map(async (locationId) => {
            const location = await this.locationRepository.findById(
                projectId,
                locationId
            );
            if (!location) {
                return;
            }

            const originalLength = location.organizationIds.length;
            location.organizationIds = location.organizationIds.filter(
                (id) => id !== organization.id
            );

            if (originalLength !== location.organizationIds.length) {
                location.updatedAt = new Date();
                await this.locationRepository.update(projectId, location);
            }
        });

        await Promise.all(detachments);
    }

    private async deleteOrganizationAssets(
        projectId: string,
        organization: Organization
    ): Promise<void> {
        await Promise.all([
            this.deleteGalleryImages(organization.galleryImageIds, projectId),
            this.deleteBgmAsset(organization.bgmId, projectId),
            this.deletePlaylistAsset(organization.playlistId, projectId),
        ]);
    }

    private async deleteGalleryImages(
        imageIds: string[],
        projectId: string
    ): Promise<void> {
        const deletions = imageIds.map(async (imageId) => {
            const image = await this.assetRepository.findImageById(
                projectId,
                imageId
            );
            if (!image) {
                return;
            }

            await this.assetRepository.deleteImage(projectId, imageId);
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

        const track = await this.assetRepository.findBGMById(projectId, bgmId);
        if (!track) {
            return;
        }

        await this.assetRepository.deleteBGM(projectId, bgmId);
        await this.storageService.deleteFile(track.storagePath || track.url);
    }

    private async deletePlaylistAsset(
        playlistId: string | null,
        projectId: string
    ): Promise<void> {
        if (!playlistId) {
            return;
        }

        const playlist = await this.assetRepository.findPlaylistById(
            projectId,
            playlistId
        );
        if (!playlist) {
            return;
        }

        await this.assetRepository.deletePlaylist(projectId, playlistId);
        const target = playlist.storagePath || playlist.url;
        if (target) {
            await this.storageService.deleteFile(target);
        }
    }
}
