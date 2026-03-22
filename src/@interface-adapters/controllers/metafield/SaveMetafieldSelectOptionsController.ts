import { Controller } from "../Controller";
import { SaveMetafieldSelectOptions } from "../../../@core/application/use-cases/metafield/SaveMetafieldSelectOptions";

export class SaveMetafieldSelectOptionsController implements Controller<
    Parameters<SaveMetafieldSelectOptions["execute"]>,
    Awaited<ReturnType<SaveMetafieldSelectOptions["execute"]>>
> {
    constructor(
        private readonly saveMetafieldSelectOptions: SaveMetafieldSelectOptions,
    ) {}

    async handle(
        ...args: Parameters<SaveMetafieldSelectOptions["execute"]>
    ): Promise<Awaited<ReturnType<SaveMetafieldSelectOptions["execute"]>>> {
        return this.saveMetafieldSelectOptions.execute(...args);
    }
}
