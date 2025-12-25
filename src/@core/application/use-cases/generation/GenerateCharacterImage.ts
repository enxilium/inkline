import { Image } from "../../../domain/entities/story/world/Image";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IImageGenerationService } from "../../../domain/services/IImageGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateCharacterImageRequest {
    projectId: string;
    characterId: string;
}

export interface GenerateCharacterImageResponse {
    image: Image;
}

export class GenerateCharacterImage {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly imageGenerationService: IImageGenerationService,
        private readonly storageService: IStorageService
    ) {}

    async execute(
        request: GenerateCharacterImageRequest,
        onProgress: (progress: number) => void
    ): Promise<GenerateCharacterImageResponse> {
        const projectId = request.projectId.trim();
        const characterId = request.characterId.trim();

        if (!projectId || !characterId) {
            throw new Error("Project ID and Character ID are required.");
        }

        const character = await this.characterRepository.findById(characterId);
        if (!character) {
            throw new Error("Character not found.");
        }

        const portraitData = await this.imageGenerationService.generatePortrait(
            character,
            onProgress
        );
        const uploadResult = await this.storageService.uploadAsset(
            portraitData,
            {
                scope: "character",
                scopeId: characterId,
                assetType: "image",
                extension: "png",
            }
        );

        const now = new Date();
        const imageId = generateId();
        const image = new Image(
            imageId,
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveImage(projectId, image);
        character.galleryImageIds.push(imageId);
        character.updatedAt = now;
        await this.characterRepository.update(character);

        return { image };
    }
}
