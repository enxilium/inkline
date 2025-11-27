import { BGM } from "../../../domain/entities/story/world/BGM";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IAudioGenerationService } from "../../../domain/services/IAudioGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateLocationSongRequest {
    projectId: string;
    locationId: string;
}

export interface GenerateLocationSongResponse {
    track: BGM;
}

export class GenerateLocationSong {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly audioGenerationService: IAudioGenerationService,
        private readonly storageService: IStorageService,
        private readonly assetRepository: IAssetRepository
    ) {}

    async execute(
        request: GenerateLocationSongRequest
    ): Promise<GenerateLocationSongResponse> {
        const projectId = request.projectId.trim();
        const locationId = request.locationId.trim();

        if (!projectId || !locationId) {
            throw new Error("Project ID and Location ID are required.");
        }

        const location = await this.locationRepository.findById(
            projectId,
            locationId
        );
        if (!location) {
            throw new Error("Location not found.");
        }

        const previousTrack = await this.getExistingBgm(projectId, location);

        const buffer = await this.audioGenerationService.generateBGM(location);
        const uploadResult = await this.storageService.uploadAsset(buffer, {
            scope: "location",
            scopeId: locationId,
            assetType: "bgm",
            extension: "mp3",
        });

        const now = new Date();
        const bgmId = generateId();
        const track = new BGM(
            bgmId,
            `${location.name} Theme`,
            "Inkflow",
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveBGM(
            projectId,
            "location",
            locationId,
            track
        );
        location.bgmId = bgmId;
        location.updatedAt = now;
        await this.locationRepository.update(projectId, location);

        await this.deleteBgmAsset(projectId, previousTrack);

        return { track };
    }

    private async getExistingBgm(
        projectId: string,
        location: { bgmId: string | null }
    ): Promise<BGM | null> {
        if (!location.bgmId) {
            return null;
        }

        return this.assetRepository.findBGMById(projectId, location.bgmId);
    }

    private async deleteBgmAsset(
        projectId: string,
        track: BGM | null
    ): Promise<void> {
        if (!track) {
            return;
        }

        await this.assetRepository.deleteBGM(projectId, track.id);
        await this.storageService.deleteFile(track.storagePath || track.url);
    }
}
