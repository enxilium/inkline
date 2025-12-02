import { BGM } from "../../../domain/entities/story/world/BGM";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IAudioGenerationService } from "../../../domain/services/IAudioGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateOrganizationSongRequest {
    projectId: string;
    organizationId: string;
}

export interface GenerateOrganizationSongResponse {
    track: BGM;
}

export class GenerateOrganizationSong {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly audioGenerationService: IAudioGenerationService,
        private readonly storageService: IStorageService,
        private readonly assetRepository: IAssetRepository
    ) {}

    async execute(
        request: GenerateOrganizationSongRequest,
        onProgress: (progress: number) => void
    ): Promise<GenerateOrganizationSongResponse> {
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

        const previousTrack = await this.getExistingBgm(
            projectId,
            organization
        );

        const buffer = await this.audioGenerationService.generateBGM(
            organization,
            onProgress
        );
        const uploadResult = await this.storageService.uploadAsset(buffer, {
            scope: "organization",
            scopeId: organizationId,
            assetType: "bgm",
            extension: "mp3",
        });

        const now = new Date();
        const trackId = generateId();
        const track = new BGM(
            trackId,
            `${organization.name} Theme`,
            "Inkflow",
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveBGM(
            projectId,
            "organization",
            organizationId,
            track
        );
        organization.bgmId = track.id;
        organization.updatedAt = now;
        await this.organizationRepository.update(organization);

        await this.deleteBgmAsset(projectId, previousTrack);

        return { track };
    }

    private async getExistingBgm(
        projectId: string,
        organization: { bgmId: string | null }
    ): Promise<BGM | null> {
        if (!organization.bgmId) {
            return null;
        }

        return this.assetRepository.findBGMById(organization.bgmId);
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
}
