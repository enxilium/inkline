import { Controller } from "../Controller";
import { DeleteAsset } from "../../../@core/application/use-cases/asset/DeleteAsset";

export class DeleteAssetController
    implements
        Controller<
            Parameters<DeleteAsset["execute"]>,
            Awaited<ReturnType<DeleteAsset["execute"]>>
        >
{
    constructor(private readonly deleteAsset: DeleteAsset) {}

    async handle(
        ...args: Parameters<DeleteAsset["execute"]>
    ): Promise<Awaited<ReturnType<DeleteAsset["execute"]>>> {
        return this.deleteAsset.execute(...args);
    }
}
