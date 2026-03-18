import { Controller } from "../Controller";
import { CreateOrReuseMetafieldDefinition } from "../../../@core/application/use-cases/metafield/CreateOrReuseMetafieldDefinition";

export class CreateOrReuseMetafieldDefinitionController implements Controller<
    Parameters<CreateOrReuseMetafieldDefinition["execute"]>,
    Awaited<ReturnType<CreateOrReuseMetafieldDefinition["execute"]>>
> {
    constructor(
        private readonly createOrReuseMetafieldDefinition: CreateOrReuseMetafieldDefinition,
    ) {}

    async handle(
        ...args: Parameters<CreateOrReuseMetafieldDefinition["execute"]>
    ): Promise<
        Awaited<ReturnType<CreateOrReuseMetafieldDefinition["execute"]>>
    > {
        return this.createOrReuseMetafieldDefinition.execute(...args);
    }
}
