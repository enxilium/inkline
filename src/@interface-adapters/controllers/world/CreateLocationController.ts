import { Controller } from "../Controller";
import { CreateLocation } from "../../../@core/application/use-cases/world/CreateLocation";

export class CreateLocationController
    implements
        Controller<
            Parameters<CreateLocation["execute"]>,
            Awaited<ReturnType<CreateLocation["execute"]>>
        >
{
    constructor(private readonly createLocation: CreateLocation) {}

    async handle(
        ...args: Parameters<CreateLocation["execute"]>
    ): Promise<Awaited<ReturnType<CreateLocation["execute"]>>> {
        return this.createLocation.execute(...args);
    }
}
