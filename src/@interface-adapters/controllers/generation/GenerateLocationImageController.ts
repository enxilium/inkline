import { Controller, IpcController } from "../Controller";
import { GenerateLocationImage } from "../../../@core/application/use-cases/generation/GenerateLocationImage";
import { IpcMainInvokeEvent } from "electron";

type ExecuteParams = Parameters<GenerateLocationImage["execute"]>;
type ControllerArgs = [ExecuteParams[0], ExecuteParams[1]?];

export class GenerateLocationImageController
    implements
        IpcController<
            ControllerArgs,
            Awaited<ReturnType<GenerateLocationImage["execute"]>>
        >
{
    constructor(
        private readonly generateLocationImage: GenerateLocationImage
    ) {}

    async handle(
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateLocationImage["execute"]>>> {
        const [request, onProgress] = args;
        return this.generateLocationImage.execute(
            request,
            onProgress || (() => {})
        );
    }

    async handleWithEvent(
        event: IpcMainInvokeEvent,
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateLocationImage["execute"]>>> {
        const [request] = args;
        return this.generateLocationImage.execute(request, (progress) => {
            event.sender.send("generation-progress", {
                type: "image",
                progress,
            });
        });
    }
}
