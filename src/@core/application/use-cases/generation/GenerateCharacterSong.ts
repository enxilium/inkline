import { BGM } from "../../../domain/entities/story/world/BGM";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IAudioGenerationService } from "../../../domain/services/IAudioGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateCharacterSongRequest {
    projectId: string;
    characterId: string;
}

export interface GenerateCharacterSongResponse {
    track: BGM;
}

export class GenerateCharacterSong {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly audioGenerationService: IAudioGenerationService,
        private readonly storageService: IStorageService,
        private readonly assetRepository: IAssetRepository
    ) {}

    async execute(
        request: GenerateCharacterSongRequest,
        onProgress: (progress: number) => void
    ): Promise<GenerateCharacterSongResponse> {
        const projectId = request.projectId.trim();
        const characterId = request.characterId.trim();

        if (!projectId || !characterId) {
            throw new Error("Project ID and Character ID are required.");
        }

        const character = await this.characterRepository.findById(characterId);
        if (!character) {
            throw new Error("Character not found.");
        }

        const previousTrack = await this.getExistingBgm(projectId, character);

        const bgmData = await this.audioGenerationService.generateBGM(
            character,
            onProgress
        );
        const uploadResult = await this.storageService.uploadAsset(bgmData, {
            scope: "character",
            scopeId: characterId,
            assetType: "bgm",
            extension: "mp3",
        });

        const now = new Date();
        const bgmId = generateId();
        const track = new BGM(
            bgmId,
            `${character.name}'s Theme`,
            "Inkflow",
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveBGM(
            projectId,
            "character",
            characterId,
            track
        );
        character.bgmId = bgmId;
        character.updatedAt = now;
        await this.characterRepository.update(character);

        await this.deleteBgmAsset(projectId, previousTrack);

        return { track };
    }

    private async getExistingBgm(
        projectId: string,
        character: { bgmId: string | null }
    ): Promise<BGM | null> {
        if (!character.bgmId) {
            return null;
        }

        return this.assetRepository.findBGMById(character.bgmId);
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
