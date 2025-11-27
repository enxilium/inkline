import { Controller } from "../Controller";
import { CreateOrganization } from "../../../@core/application/use-cases/world/CreateOrganization";

export class CreateOrganizationController
    implements
        Controller<
            Parameters<CreateOrganization["execute"]>,
            Awaited<ReturnType<CreateOrganization["execute"]>>
        >
{
    constructor(private readonly createOrganization: CreateOrganization) {}

    async handle(
        ...args: Parameters<CreateOrganization["execute"]>
    ): Promise<Awaited<ReturnType<CreateOrganization["execute"]>>> {
        return this.createOrganization.execute(...args);
    }
}
