import { Controller } from "../Controller";
import { SaveMetafieldValue } from "../../../@core/application/use-cases/metafield/SaveMetafieldValue";

export class SaveMetafieldValueController implements Controller<
    Parameters<SaveMetafieldValue["execute"]>,
    Awaited<ReturnType<SaveMetafieldValue["execute"]>>
> {
    constructor(private readonly saveMetafieldValue: SaveMetafieldValue) {}

    async handle(
        ...args: Parameters<SaveMetafieldValue["execute"]>
    ): Promise<Awaited<ReturnType<SaveMetafieldValue["execute"]>>> {
        return this.saveMetafieldValue.execute(...args);
    }
}
