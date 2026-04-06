import { IpcController } from "../Controller";
import { GenerateCharacterImage } from "../../../@core/application/use-cases/generation/GenerateCharacterImage";
import { IpcMainInvokeEvent } from "electron";
import { createGenerationProgressRelay } from "./generationProgress";

type ExecuteParams = Parameters<GenerateCharacterImage["execute"]>;
type ControllerArgs = [ExecuteParams[0], ExecuteParams[1]?];

export class GenerateCharacterImageController implements IpcController<
    ControllerArgs,
    Awaited<ReturnType<GenerateCharacterImage["execute"]>>
> {
    constructor(
        private readonly generateCharacterImage: GenerateCharacterImage,
    ) {}

    async handle(
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateCharacterImage["execute"]>>> {
        const [request, onProgress] = args;
        return this.generateCharacterImage.execute(request, onProgress);
    }

    async handleWithEvent(
        event: IpcMainInvokeEvent,
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateCharacterImage["execute"]>>> {
        const [request] = args;
        const progressRelay = createGenerationProgressRelay(
            event.sender,
            "image",
        );
        progressRelay.startWarmup();

        try {
            return await this.generateCharacterImage.execute(
                request,
                progressRelay.onProgress,
            );
        } finally {
            progressRelay.stopWarmup();
        }
    }
}
