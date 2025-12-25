import {
    OverwriteLocation,
    OverwriteLocationRequest,
} from "../../../@core/application/use-cases/world/OverwriteLocation";
import { Controller } from "../Controller";

export class OverwriteLocationController
    implements Controller<[OverwriteLocationRequest], void>
{
    constructor(private readonly useCase: OverwriteLocation) {}

    async handle(request: OverwriteLocationRequest): Promise<void> {
        await this.useCase.execute(request);
    }
}
