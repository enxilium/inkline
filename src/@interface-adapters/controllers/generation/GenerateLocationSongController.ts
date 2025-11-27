import { Controller } from "../Controller";
import { GenerateLocationSong } from "../../../@core/application/use-cases/generation/GenerateLocationSong";

export class GenerateLocationSongController
    implements
        Controller<
            Parameters<GenerateLocationSong["execute"]>,
            Awaited<ReturnType<GenerateLocationSong["execute"]>>
        >
{
    constructor(private readonly generateLocationSong: GenerateLocationSong) {}

    async handle(
        ...args: Parameters<GenerateLocationSong["execute"]>
    ): Promise<Awaited<ReturnType<GenerateLocationSong["execute"]>>> {
        return this.generateLocationSong.execute(...args);
    }
}
