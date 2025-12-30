import { IAudioGenerationService } from "./IAudioGenerationService";
import { IImageGenerationService } from "./IImageGenerationService";

export interface ICreativeAssetGenerationService
    extends IAudioGenerationService,
        IImageGenerationService {
    waitForReady(): Promise<void>;
}
