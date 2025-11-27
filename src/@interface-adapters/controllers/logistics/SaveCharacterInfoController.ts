import { Controller } from "../Controller";
import { SaveCharacterInfo } from "../../../@core/application/use-cases/logistics/SaveCharacterInfo";

export class SaveCharacterInfoController
    implements
        Controller<
            Parameters<SaveCharacterInfo["execute"]>,
            Awaited<ReturnType<SaveCharacterInfo["execute"]>>
        >
{
    constructor(private readonly saveCharacterInfo: SaveCharacterInfo) {}

    async handle(
        ...args: Parameters<SaveCharacterInfo["execute"]>
    ): Promise<Awaited<ReturnType<SaveCharacterInfo["execute"]>>> {
        return this.saveCharacterInfo.execute(...args);
    }
}
