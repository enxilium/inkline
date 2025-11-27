import { Controller } from "../Controller";
import { SaveLocationInfo } from "../../../@core/application/use-cases/logistics/SaveLocationInfo";

export class SaveLocationInfoController
    implements
        Controller<
            Parameters<SaveLocationInfo["execute"]>,
            Awaited<ReturnType<SaveLocationInfo["execute"]>>
        >
{
    constructor(private readonly saveLocationInfo: SaveLocationInfo) {}

    async handle(
        ...args: Parameters<SaveLocationInfo["execute"]>
    ): Promise<Awaited<ReturnType<SaveLocationInfo["execute"]>>> {
        return this.saveLocationInfo.execute(...args);
    }
}
