import { Controller, IpcController } from "../Controller";
import { GenerateLocationSong } from "../../../@core/application/use-cases/generation/GenerateLocationSong";
import { IpcMainInvokeEvent } from "electron";

type ExecuteParams = Parameters<GenerateLocationSong["execute"]>;
type ControllerArgs = [ExecuteParams[0], ExecuteParams[1]?];

export class GenerateLocationSongController
    implements
        IpcController<
            ControllerArgs,
            Awaited<ReturnType<GenerateLocationSong["execute"]>>
        >
{
    constructor(private readonly generateLocationSong: GenerateLocationSong) {}

    async handle(
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateLocationSong["execute"]>>> {
        const [request, onProgress] = args;
        return this.generateLocationSong.execute(
            request,
            onProgress
        );
    }

    async handleWithEvent(
        event: IpcMainInvokeEvent,
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateLocationSong["execute"]>>> {
        const [request] = args;
        return this.generateLocationSong.execute(request, (progress) => {
            event.sender.send("generation-progress", {
                type: "audio",
                progress,
            });
        });
    }
}
