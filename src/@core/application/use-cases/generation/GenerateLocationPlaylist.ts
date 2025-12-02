import { Playlist } from "../../../domain/entities/story/world/Playlist";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IPlaylistGenerationService } from "../../../domain/services/IPlaylistGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateLocationPlaylistRequest {
    projectId: string;
    locationId: string;
}

export interface GenerateLocationPlaylistResponse {
    playlist: Playlist;
}

export class GenerateLocationPlaylist {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly playlistGenerationService: IPlaylistGenerationService,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService
    ) {}

    async execute(
        request: GenerateLocationPlaylistRequest
    ): Promise<GenerateLocationPlaylistResponse> {
        const projectId = request.projectId.trim();
        const locationId = request.locationId.trim();

        if (!projectId || !locationId) {
            throw new Error("Project ID and Location ID are required.");
        }

        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            throw new Error("Location not found.");
        }

        const previousPlaylist = await this.getExistingPlaylist(
            projectId,
            location
        );

        const generated =
            await this.playlistGenerationService.generatePlaylist(location);
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

        await this.assetRepository.savePlaylist(
            projectId,
            "location",
            locationId,
            playlist
        );

        location.playlistId = playlist.id;
        location.updatedAt = now;
        await this.locationRepository.update(location);

        await this.deletePlaylistAsset(projectId, previousPlaylist);

        return { playlist };
    }

    private async getExistingPlaylist(
        projectId: string,
        location: { playlistId: string | null }
    ): Promise<Playlist | null> {
        if (!location.playlistId) {
            return null;
        }

        const existing = await this.assetRepository.findPlaylistById(
            location.playlistId
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
