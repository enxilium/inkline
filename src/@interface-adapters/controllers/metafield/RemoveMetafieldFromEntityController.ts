import { Controller } from "../Controller";
import { RemoveMetafieldFromEntity } from "../../../@core/application/use-cases/metafield/RemoveMetafieldFromEntity";

export class RemoveMetafieldFromEntityController implements Controller<
    Parameters<RemoveMetafieldFromEntity["execute"]>,
    Awaited<ReturnType<RemoveMetafieldFromEntity["execute"]>>
> {
    constructor(
        private readonly removeMetafieldFromEntity: RemoveMetafieldFromEntity,
    ) {}

    async handle(
        ...args: Parameters<RemoveMetafieldFromEntity["execute"]>
    ): Promise<Awaited<ReturnType<RemoveMetafieldFromEntity["execute"]>>> {
        return this.removeMetafieldFromEntity.execute(...args);
    }
}
