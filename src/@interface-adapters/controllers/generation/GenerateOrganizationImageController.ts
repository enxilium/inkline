import { IpcController } from "../Controller";
import { GenerateOrganizationImage } from "../../../@core/application/use-cases/generation/GenerateOrganizationImage";
import { IpcMainInvokeEvent } from "electron";
import { createGenerationProgressRelay } from "./generationProgress";

type ExecuteParams = Parameters<GenerateOrganizationImage["execute"]>;
type ControllerArgs = [ExecuteParams[0], ExecuteParams[1]?];

export class GenerateOrganizationImageController implements IpcController<
    ControllerArgs,
    Awaited<ReturnType<GenerateOrganizationImage["execute"]>>
> {
    constructor(
        private readonly generateOrganizationImage: GenerateOrganizationImage,
    ) {}

    async handle(
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateOrganizationImage["execute"]>>> {
        const [request, onProgress] = args;
        return this.generateOrganizationImage.execute(request, onProgress);
    }

    async handleWithEvent(
        event: IpcMainInvokeEvent,
        ...args: ControllerArgs
    ): Promise<Awaited<ReturnType<GenerateOrganizationImage["execute"]>>> {
        const [request] = args;
        const progressRelay = createGenerationProgressRelay(
            event.sender,
            "image",
        );
        progressRelay.startWarmup();

        try {
            return await this.generateOrganizationImage.execute(
                request,
                progressRelay.onProgress,
            );
        } finally {
            progressRelay.stopWarmup();
        }
    }
}
