import { Controller } from "../Controller";
import { ListProjectMetafields } from "../../../@core/application/use-cases/metafield/ListProjectMetafields";

export class ListProjectMetafieldsController implements Controller<
    Parameters<ListProjectMetafields["execute"]>,
    Awaited<ReturnType<ListProjectMetafields["execute"]>>
> {
    constructor(
        private readonly listProjectMetafields: ListProjectMetafields,
    ) {}

    async handle(
        ...args: Parameters<ListProjectMetafields["execute"]>
    ): Promise<Awaited<ReturnType<ListProjectMetafields["execute"]>>> {
        return this.listProjectMetafields.execute(...args);
    }
}
