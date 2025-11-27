import { Controller } from "../Controller";
import { GenerateLocationPlaylist } from "../../../@core/application/use-cases/generation/GenerateLocationPlaylist";

export class GenerateLocationPlaylistController
    implements
        Controller<
            Parameters<GenerateLocationPlaylist["execute"]>,
            Awaited<ReturnType<GenerateLocationPlaylist["execute"]>>
        >
{
    constructor(
        private readonly generateLocationPlaylist: GenerateLocationPlaylist
    ) {}

    async handle(
        ...args: Parameters<GenerateLocationPlaylist["execute"]>
    ): Promise<Awaited<ReturnType<GenerateLocationPlaylist["execute"]>>> {
        return this.generateLocationPlaylist.execute(...args);
    }
}
