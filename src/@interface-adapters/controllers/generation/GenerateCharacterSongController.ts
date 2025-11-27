import { Controller } from "../Controller";
import { GenerateCharacterSong } from "../../../@core/application/use-cases/generation/GenerateCharacterSong";

export class GenerateCharacterSongController
    implements
        Controller<
            Parameters<GenerateCharacterSong["execute"]>,
            Awaited<ReturnType<GenerateCharacterSong["execute"]>>
        >
{
    constructor(
        private readonly generateCharacterSong: GenerateCharacterSong
    ) {}

    async handle(
        ...args: Parameters<GenerateCharacterSong["execute"]>
    ): Promise<Awaited<ReturnType<GenerateCharacterSong["execute"]>>> {
        return this.generateCharacterSong.execute(...args);
    }
}
