import { Image } from "../../../domain/entities/story/world/Image";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IImageGenerationService } from "../../../domain/services/IImageGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateLocationImageRequest {
    projectId: string;
    locationId: string;
}

export interface GenerateLocationImageResponse {
    image: Image;
}

export class GenerateLocationImage {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly imageGenerationService: IImageGenerationService,
        private readonly storageService: IStorageService
    ) {}

    async execute(
        request: GenerateLocationImageRequest,
        onProgress: (progress: number) => void
    ): Promise<GenerateLocationImageResponse> {
        const projectId = request.projectId.trim();
        const locationId = request.locationId.trim();

        if (!projectId || !locationId) {
            throw new Error("Project ID and Location ID are required.");
        }

        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            throw new Error("Location not found.");
        }

        const buffer = await this.imageGenerationService.generatePortrait(
            location,
            onProgress
        );
        const uploadResult = await this.storageService.uploadAsset(buffer, {
            scope: "location",
            scopeId: locationId,
            assetType: "image",
            extension: "png",
        });

        const now = new Date();
        const imageId = generateId();
        const image = new Image(
            imageId,
            uploadResult.url,
            uploadResult.path,
            now,
            now
        );

        await this.assetRepository.saveImage(
            projectId,
            "location",
            locationId,
            image
        );
        location.galleryImageIds.push(imageId);
        location.updatedAt = now;
        await this.locationRepository.update(location);

        return { image };
    }
}
