import { Controller } from "../Controller";
import { GenerateOrganizationPlaylist } from "../../../@core/application/use-cases/generation/GenerateOrganizationPlaylist";

export class GenerateOrganizationPlaylistController
    implements
        Controller<
            Parameters<GenerateOrganizationPlaylist["execute"]>,
            Awaited<ReturnType<GenerateOrganizationPlaylist["execute"]>>
        >
{
    constructor(
        private readonly generateOrganizationPlaylist: GenerateOrganizationPlaylist
    ) {}

    async handle(
        ...args: Parameters<GenerateOrganizationPlaylist["execute"]>
    ): Promise<Awaited<ReturnType<GenerateOrganizationPlaylist["execute"]>>> {
        return this.generateOrganizationPlaylist.execute(...args);
    }
}
