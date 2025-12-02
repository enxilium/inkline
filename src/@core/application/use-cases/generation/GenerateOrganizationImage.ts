import { Image } from "../../../domain/entities/story/world/Image";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IImageGenerationService } from "../../../domain/services/IImageGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateOrganizationImageRequest {
    projectId: string;
    organizationId: string;
}

export interface GenerateOrganizationImageResponse {
    image: Image;
}

export class GenerateOrganizationImage {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly imageGenerationService: IImageGenerationService,
        private readonly storageService: IStorageService
    ) {}

    async execute(
        request: GenerateOrganizationImageRequest,
        onProgress: (progress: number) => void
    ): Promise<GenerateOrganizationImageResponse> {
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

        const buffer = await this.imageGenerationService.generatePortrait(
            organization,
            onProgress
        );
        const uploadResult = await this.storageService.uploadAsset(buffer, {
            scope: "organization",
            scopeId: organizationId,
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
            "organization",
            organizationId,
            image
        );
        organization.galleryImageIds.push(imageId);
        organization.updatedAt = now;
        await this.organizationRepository.update(organization);

        return { image };
    }
}
