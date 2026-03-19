import { Controller } from "../Controller";
import { DeleteMetafieldDefinitionGlobal } from "../../../@core/application/use-cases/metafield/DeleteMetafieldDefinitionGlobal";

export class DeleteMetafieldDefinitionGlobalController implements Controller<
    Parameters<DeleteMetafieldDefinitionGlobal["execute"]>,
    Awaited<ReturnType<DeleteMetafieldDefinitionGlobal["execute"]>>
> {
    constructor(
        private readonly deleteMetafieldDefinitionGlobal: DeleteMetafieldDefinitionGlobal,
    ) {}

    async handle(
        ...args: Parameters<DeleteMetafieldDefinitionGlobal["execute"]>
    ): Promise<
        Awaited<ReturnType<DeleteMetafieldDefinitionGlobal["execute"]>>
    > {
        return this.deleteMetafieldDefinitionGlobal.execute(...args);
    }
}
