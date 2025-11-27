import { Controller } from "../Controller";
import { GenerateCharacterImage } from "../../../@core/application/use-cases/generation/GenerateCharacterImage";

export class GenerateCharacterImageController
    implements
        Controller<
            Parameters<GenerateCharacterImage["execute"]>,
            Awaited<ReturnType<GenerateCharacterImage["execute"]>>
        >
{
    constructor(
        private readonly generateCharacterImage: GenerateCharacterImage
    ) {}

    async handle(
        ...args: Parameters<GenerateCharacterImage["execute"]>
    ): Promise<Awaited<ReturnType<GenerateCharacterImage["execute"]>>> {
        return this.generateCharacterImage.execute(...args);
    }
}
