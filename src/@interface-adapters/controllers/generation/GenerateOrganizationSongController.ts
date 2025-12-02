import { Controller, IpcController } from "../Controller";
import { GenerateOrganizationSong } from "../../../@core/application/use-cases/generation/GenerateOrganizationSong";
import { IpcMainInvokeEvent } from "electron";

type ExecuteParams = Parameters<GenerateOrganizationSong["execute"]>;
type ControllerArgs = [ExecuteParams[0], ExecuteParams[1]?];

export class GenerateOrganizationSongController
    implements
        IpcController<
            ControllerArgs,
            Awaited<ReturnType<GenerateOrganizationSong["execute"]>>
        >
{
    constructor(
        private readonly generateOrganizationSong: GenerateOrganizationSong
    ) {}

    async handle(
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateOrganizationSong["execute"]>>> {
        const [request, onProgress] = args;
        return this.generateOrganizationSong.execute(
            request,
            onProgress || (() => {})
        );
    }

    async handleWithEvent(
        event: IpcMainInvokeEvent,
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateOrganizationSong["execute"]>>> {
        const [request] = args;
        return this.generateOrganizationSong.execute(request, (progress) => {
            event.sender.send("generation-progress", {
                type: "audio",
                progress,
            });
        });
    }
}
