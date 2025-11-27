import { Controller } from "../Controller";
import { DeleteOrganization } from "../../../@core/application/use-cases/world/DeleteOrganization";

export class DeleteOrganizationController
    implements
        Controller<
            Parameters<DeleteOrganization["execute"]>,
            Awaited<ReturnType<DeleteOrganization["execute"]>>
        >
{
    constructor(private readonly deleteOrganization: DeleteOrganization) {}

    async handle(
        ...args: Parameters<DeleteOrganization["execute"]>
    ): Promise<Awaited<ReturnType<DeleteOrganization["execute"]>>> {
        return this.deleteOrganization.execute(...args);
    }
}
