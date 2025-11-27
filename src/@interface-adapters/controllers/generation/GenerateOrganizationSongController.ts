import { Controller } from "../Controller";
import { GenerateOrganizationSong } from "../../../@core/application/use-cases/generation/GenerateOrganizationSong";

export class GenerateOrganizationSongController
    implements
        Controller<
            Parameters<GenerateOrganizationSong["execute"]>,
            Awaited<ReturnType<GenerateOrganizationSong["execute"]>>
        >
{
    constructor(
        private readonly generateOrganizationSong: GenerateOrganizationSong
    ) {}

    async handle(
        ...args: Parameters<GenerateOrganizationSong["execute"]>
    ): Promise<Awaited<ReturnType<GenerateOrganizationSong["execute"]>>> {
        return this.generateOrganizationSong.execute(...args);
    }
}
