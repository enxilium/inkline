import { Controller } from "../Controller";
import { ImportAsset } from "../../../@core/application/use-cases/asset/ImportAsset";

export class ImportAssetController
    implements
        Controller<
            Parameters<ImportAsset["execute"]>,
            Awaited<ReturnType<ImportAsset["execute"]>>
        >
{
    constructor(private readonly importAsset: ImportAsset) {}

    async handle(
        ...args: Parameters<ImportAsset["execute"]>
    ): Promise<Awaited<ReturnType<ImportAsset["execute"]>>> {
        return this.importAsset.execute(...args);
    }
}
