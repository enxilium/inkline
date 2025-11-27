import { Controller } from "../Controller";
import { SaveUserSettings } from "../../../@core/application/use-cases/logistics/SaveUserSettings";

export class SaveUserSettingsController
    implements
        Controller<
            Parameters<SaveUserSettings["execute"]>,
            Awaited<ReturnType<SaveUserSettings["execute"]>>
        >
{
    constructor(private readonly saveUserSettings: SaveUserSettings) {}

    async handle(
        ...args: Parameters<SaveUserSettings["execute"]>
    ): Promise<Awaited<ReturnType<SaveUserSettings["execute"]>>> {
        return this.saveUserSettings.execute(...args);
    }
}
