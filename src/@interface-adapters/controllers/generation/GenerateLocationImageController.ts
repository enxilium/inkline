import { Controller } from "../Controller";
import { GenerateLocationImage } from "../../../@core/application/use-cases/generation/GenerateLocationImage";

export class GenerateLocationImageController
    implements
        Controller<
            Parameters<GenerateLocationImage["execute"]>,
            Awaited<ReturnType<GenerateLocationImage["execute"]>>
        >
{
    constructor(
        private readonly generateLocationImage: GenerateLocationImage
    ) {}

    async handle(
        ...args: Parameters<GenerateLocationImage["execute"]>
    ): Promise<Awaited<ReturnType<GenerateLocationImage["execute"]>>> {
        return this.generateLocationImage.execute(...args);
    }
}
