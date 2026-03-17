import { Controller } from "../Controller";
import { ReorderLocationChildren } from "../../../@core/application/use-cases/logistics/ReorderLocationChildren";

export class ReorderLocationChildrenController implements Controller<
    Parameters<ReorderLocationChildren["execute"]>,
    Awaited<ReturnType<ReorderLocationChildren["execute"]>>
> {
    constructor(
        private readonly reorderLocationChildren: ReorderLocationChildren,
    ) {}

    async handle(
        ...args: Parameters<ReorderLocationChildren["execute"]>
    ): Promise<Awaited<ReturnType<ReorderLocationChildren["execute"]>>> {
        return this.reorderLocationChildren.execute(...args);
    }
}
