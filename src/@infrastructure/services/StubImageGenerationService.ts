import { Character } from "../../@core/domain/entities/story/world/Character";
import { Location } from "../../@core/domain/entities/story/world/Location";
import { Organization } from "../../@core/domain/entities/story/world/Organization";
import { IImageGenerationService } from "../../@core/domain/services/IImageGenerationService";
import { NarrativeContext } from "../../@core/domain/services/NarrativeContext";

const ERROR_MESSAGE = "Image generation is not available in this build.";

export class StubImageGenerationService implements IImageGenerationService {
    async generatePortrait(
        _subject: Character | Location | Organization
    ): Promise<ArrayBuffer> {
        throw new Error(ERROR_MESSAGE);
    }

    async generateCover(_projectId: string): Promise<ArrayBuffer> {
        throw new Error(ERROR_MESSAGE);
    }

    async generateScene(
        _description: string,
        _context: NarrativeContext
    ): Promise<ArrayBuffer> {
        throw new Error(ERROR_MESSAGE);
    }
}
