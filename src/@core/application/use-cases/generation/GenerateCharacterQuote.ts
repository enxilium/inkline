import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IAudioGenerationService } from "../../../domain/services/IAudioGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";

export interface GenerateCharacterQuoteRequest {
    projectId: string;
    characterId: string;
    quote: string;
}

export interface GenerateCharacterQuoteResponse {
    quote: string;
    audioUrl: string;
}

export class GenerateCharacterQuote {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly audioGenerationService: IAudioGenerationService,
        private readonly storageService: IStorageService,
        private readonly assetRepository: IAssetRepository
    ) {}

    async execute(
        request: GenerateCharacterQuoteRequest
    ): Promise<GenerateCharacterQuoteResponse> {
        const projectId = request.projectId.trim();
        const characterId = request.characterId.trim();
        const quote = request.quote;

        if (!projectId || !characterId) {
            throw new Error("Project ID and Character ID are required.");
        }

        const character = await this.characterRepository.findById(
            projectId,
            characterId
        );
        if (!character) {
            throw new Error("Character not found for this project.");
        }

        if (!character.voiceId) {
            throw new Error(
                "Character voice is required before generating spoken quotes."
            );
        }

        const voice = await this.assetRepository.findVoiceById(
            projectId,
            character.voiceId
        );
        if (!voice) {
            throw new Error("Voice asset not found for this character.");
        }

        const audioBuffer = await this.audioGenerationService.generateDialogue(
            quote,
            voice
        );

        const uploadResult = await this.storageService.uploadAsset(
            audioBuffer,
            {
                scope: "character",
                scopeId: characterId,
                assetType: "audio",
                extension: "wav",
            }
        );

        const previousPath =
            character.quoteAudioStoragePath || character.quoteAudioUrl;
        if (previousPath) {
            await this.storageService.deleteFile(previousPath);
        }

        character.quote = quote;
        character.quoteAudioUrl = uploadResult.url;
        character.quoteAudioStoragePath = uploadResult.path;
        character.updatedAt = new Date();
        await this.characterRepository.update(projectId, character);

        return { quote, audioUrl: uploadResult.url };
    }
}
