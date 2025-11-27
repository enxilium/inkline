import { Controller } from "../Controller";
import { GenerateCharacterVoice } from "../../../@core/application/use-cases/generation/GenerateCharacterVoice";

export class GenerateCharacterVoiceController
    implements
        Controller<
            Parameters<GenerateCharacterVoice["execute"]>,
            Awaited<ReturnType<GenerateCharacterVoice["execute"]>>
        >
{
    constructor(
        private readonly generateCharacterVoice: GenerateCharacterVoice
    ) {}

    async handle(
        ...args: Parameters<GenerateCharacterVoice["execute"]>
    ): Promise<Awaited<ReturnType<GenerateCharacterVoice["execute"]>>> {
        return this.generateCharacterVoice.execute(...args);
    }
}
