import { Controller, IpcController } from "../Controller";
import { GenerateCharacterSong } from "../../../@core/application/use-cases/generation/GenerateCharacterSong";
import { IpcMainInvokeEvent } from "electron";

type ExecuteParams = Parameters<GenerateCharacterSong["execute"]>;
type ControllerArgs = [ExecuteParams[0], ExecuteParams[1]?];

export class GenerateCharacterSongController
    implements
        IpcController<
            ControllerArgs,
            Awaited<ReturnType<GenerateCharacterSong["execute"]>>
        >
{
    constructor(
        private readonly generateCharacterSong: GenerateCharacterSong
    ) {}

    async handle(
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateCharacterSong["execute"]>>> {
        const [request, onProgress] = args;
        return this.generateCharacterSong.execute(
            request,
            onProgress
        );
    }

    async handleWithEvent(
        event: IpcMainInvokeEvent,
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateCharacterSong["execute"]>>> {
        const [request] = args;
        return this.generateCharacterSong.execute(request, (progress) => {
            event.sender.send("generation-progress", {
                type: "audio",
                progress,
            });
        });
    }
}
