import {
    OverwriteOrganization,
    OverwriteOrganizationRequest,
} from "../../../@core/application/use-cases/world/OverwriteOrganization";
import { Controller } from "../Controller";

export class OverwriteOrganizationController
    implements Controller<[OverwriteOrganizationRequest], void>
{
    constructor(private readonly useCase: OverwriteOrganization) {}

    async handle(request: OverwriteOrganizationRequest): Promise<void> {
        await this.useCase.execute(request);
    }
}
