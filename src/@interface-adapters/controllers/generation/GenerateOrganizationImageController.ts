import { Controller } from "../Controller";
import { GenerateOrganizationImage } from "../../../@core/application/use-cases/generation/GenerateOrganizationImage";

export class GenerateOrganizationImageController
    implements
        Controller<
            Parameters<GenerateOrganizationImage["execute"]>,
            Awaited<ReturnType<GenerateOrganizationImage["execute"]>>
        >
{
    constructor(
        private readonly generateOrganizationImage: GenerateOrganizationImage
    ) {}

    async handle(
        ...args: Parameters<GenerateOrganizationImage["execute"]>
    ): Promise<Awaited<ReturnType<GenerateOrganizationImage["execute"]>>> {
        return this.generateOrganizationImage.execute(...args);
    }
}
