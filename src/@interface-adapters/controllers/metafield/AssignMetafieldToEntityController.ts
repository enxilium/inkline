import { Controller } from "../Controller";
import { AssignMetafieldToEntity } from "../../../@core/application/use-cases/metafield/AssignMetafieldToEntity";

export class AssignMetafieldToEntityController implements Controller<
    Parameters<AssignMetafieldToEntity["execute"]>,
    Awaited<ReturnType<AssignMetafieldToEntity["execute"]>>
> {
    constructor(
        private readonly assignMetafieldToEntity: AssignMetafieldToEntity,
    ) {}

    async handle(
        ...args: Parameters<AssignMetafieldToEntity["execute"]>
    ): Promise<Awaited<ReturnType<AssignMetafieldToEntity["execute"]>>> {
        return this.assignMetafieldToEntity.execute(...args);
    }
}
