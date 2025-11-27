import { Controller } from "../Controller";
import { DeleteLocation } from "../../../@core/application/use-cases/world/DeleteLocation";

export class DeleteLocationController
    implements
        Controller<
            Parameters<DeleteLocation["execute"]>,
            Awaited<ReturnType<DeleteLocation["execute"]>>
        >
{
    constructor(private readonly deleteLocation: DeleteLocation) {}

    async handle(
        ...args: Parameters<DeleteLocation["execute"]>
    ): Promise<Awaited<ReturnType<DeleteLocation["execute"]>>> {
        return this.deleteLocation.execute(...args);
    }
}
