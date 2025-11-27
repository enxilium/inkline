import { Controller } from "../Controller";
import { GenerateCharacterPlaylist } from "../../../@core/application/use-cases/generation/GenerateCharacterPlaylist";

export class GenerateCharacterPlaylistController
    implements
        Controller<
            Parameters<GenerateCharacterPlaylist["execute"]>,
            Awaited<ReturnType<GenerateCharacterPlaylist["execute"]>>
        >
{
    constructor(
        private readonly generateCharacterPlaylist: GenerateCharacterPlaylist
    ) {}

    async handle(
        ...args: Parameters<GenerateCharacterPlaylist["execute"]>
    ): Promise<Awaited<ReturnType<GenerateCharacterPlaylist["execute"]>>> {
        return this.generateCharacterPlaylist.execute(...args);
    }
}
