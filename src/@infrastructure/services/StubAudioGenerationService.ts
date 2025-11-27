import { Character } from "../../@core/domain/entities/story/world/Character";
import { Location } from "../../@core/domain/entities/story/world/Location";
import { Organization } from "../../@core/domain/entities/story/world/Organization";
import { Voice } from "../../@core/domain/entities/story/world/Voice";
import { IAudioGenerationService } from "../../@core/domain/services/IAudioGenerationService";

const ERROR_MESSAGE = "Audio generation is not available in this build.";

export class StubAudioGenerationService implements IAudioGenerationService {
    async designVoice(_character: Character): Promise<ArrayBuffer> {
        throw new Error(ERROR_MESSAGE);
    }

    async generateDialogue(_text: string, _voice: Voice): Promise<ArrayBuffer> {
        throw new Error(ERROR_MESSAGE);
    }

    async generateBGM(
        _subject: Character | Location | Organization
    ): Promise<ArrayBuffer> {
        throw new Error(ERROR_MESSAGE);
    }
}
