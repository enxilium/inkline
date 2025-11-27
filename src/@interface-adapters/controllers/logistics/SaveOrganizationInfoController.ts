import { Controller } from "../Controller";
import { SaveOrganizationInfo } from "../../../@core/application/use-cases/logistics/SaveOrganizationInfo";

export class SaveOrganizationInfoController
    implements
        Controller<
            Parameters<SaveOrganizationInfo["execute"]>,
            Awaited<ReturnType<SaveOrganizationInfo["execute"]>>
        >
{
    constructor(private readonly saveOrganizationInfo: SaveOrganizationInfo) {}

    async handle(
        ...args: Parameters<SaveOrganizationInfo["execute"]>
    ): Promise<Awaited<ReturnType<SaveOrganizationInfo["execute"]>>> {
        return this.saveOrganizationInfo.execute(...args);
    }
}
