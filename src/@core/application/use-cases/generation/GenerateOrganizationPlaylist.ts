import { Playlist } from "../../../domain/entities/story/world/Playlist";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IPlaylistGenerationService } from "../../../domain/services/IPlaylistGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateOrganizationPlaylistRequest {
    projectId: string;
    organizationId: string;
}

export interface GenerateOrganizationPlaylistResponse {
    playlist: Playlist;
}

export class GenerateOrganizationPlaylist {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly playlistGenerationService: IPlaylistGenerationService,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService
    ) {}

    async execute(
        request: GenerateOrganizationPlaylistRequest
    ): Promise<GenerateOrganizationPlaylistResponse> {
        const projectId = request.projectId.trim();
        const organizationId = request.organizationId.trim();

        if (!projectId || !organizationId) {
            throw new Error("Project ID and Organization ID are required.");
        }

        const organization =
            await this.organizationRepository.findById(organizationId);
        if (!organization) {
            throw new Error("Organization not found.");
        }

        const previousPlaylist = await this.getExistingPlaylist(
            projectId,
            organization
        );

        const generated =
            await this.playlistGenerationService.generatePlaylist(organization);
        const now = new Date();
        const playlist = new Playlist(
            generateId(),
            generated.name,
            generated.description,
            generated.tracks,
            generated.url,
            generated.storagePath ?? "",
            now,
            now
        );

        await this.assetRepository.savePlaylist(projectId, playlist);
        organization.playlistId = playlist.id;
        organization.updatedAt = now;
        await this.organizationRepository.update(organization);

        await this.deletePlaylistAsset(projectId, previousPlaylist);

        return { playlist };
    }

    private async getExistingPlaylist(
        projectId: string,
        organization: { playlistId: string | null }
    ): Promise<Playlist | null> {
        if (!organization.playlistId) {
            return null;
        }

        const existing = await this.assetRepository.findPlaylistById(
            organization.playlistId
        );
        return existing;
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
}
