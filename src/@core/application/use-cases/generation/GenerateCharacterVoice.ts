import { Voice } from "../../../domain/entities/story/world/Voice";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IAudioGenerationService } from "../../../domain/services/IAudioGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateCharacterVoiceRequest {
    projectId: string;
    characterId: string;
}

export interface GenerateCharacterVoiceResponse {
    voice: Voice;
}

export class GenerateCharacterVoice {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly audioGenerationService: IAudioGenerationService,
        private readonly storageService: IStorageService,
        private readonly assetRepository: IAssetRepository
    ) {}

    async execute(
        request: GenerateCharacterVoiceRequest
    ): Promise<GenerateCharacterVoiceResponse> {
        const projectId = request.projectId.trim();
        const characterId = request.characterId.trim();

        if (!projectId || !characterId) {
            throw new Error("Project ID and Character ID are required.");
        }

        const character = await this.characterRepository.findById(
            projectId,
            characterId
        );
        if (!character) {
            throw new Error("Character not found.");
        }

        const previousVoice = await this.getExistingVoiceAsset(
            projectId,
            character
        );

        const voiceData =
            await this.audioGenerationService.designVoice(character);
        const uploadResult = await this.storageService.uploadAsset(voiceData, {
            scope: "character",
            scopeId: characterId,
            assetType: "voice",
            extension: "wav",
        });

        const now = new Date();
        const voiceId = generateId();
        const voice = new Voice(
            voiceId,
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveVoice(projectId, characterId, voice);
        character.voiceId = voiceId;
        character.updatedAt = now;
        await this.characterRepository.update(projectId, character);

        await this.deleteVoiceAsset(projectId, previousVoice);

        return { voice };
    }

    private async getExistingVoiceAsset(
        projectId: string,
        character: { voiceId: string | null }
    ): Promise<Voice | null> {
        if (!character.voiceId) {
            return null;
        }

        return this.assetRepository.findVoiceById(projectId, character.voiceId);
    }

    private async deleteVoiceAsset(
        projectId: string,
        voice: Voice | null
    ): Promise<void> {
        if (!voice) {
            return;
        }

        await this.assetRepository.deleteVoice(projectId, voice.id);
        await this.storageService.deleteFile(voice.storagePath || voice.url);
    }
}
