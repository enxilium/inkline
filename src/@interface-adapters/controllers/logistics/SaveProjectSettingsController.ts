import { Controller } from "../Controller";
import { SaveProjectSettings } from "../../../@core/application/use-cases/logistics/SaveProjectSettings";

export class SaveProjectSettingsController
    implements
        Controller<
            Parameters<SaveProjectSettings["execute"]>,
            Awaited<ReturnType<SaveProjectSettings["execute"]>>
        >
{
    constructor(private readonly saveProjectSettings: SaveProjectSettings) {}

    async handle(
        ...args: Parameters<SaveProjectSettings["execute"]>
    ): Promise<Awaited<ReturnType<SaveProjectSettings["execute"]>>> {
        return this.saveProjectSettings.execute(...args);
    }
}
