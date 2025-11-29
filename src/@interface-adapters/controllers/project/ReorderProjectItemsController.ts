import { Controller } from "../Controller";
import {
    ReorderProjectItems,
    ReorderProjectItemsRequest,
} from "../../../@core/application/use-cases/project/ReorderProjectItems";

export class ReorderProjectItemsController
    implements Controller<[ReorderProjectItemsRequest], void>
{
    constructor(private readonly useCase: ReorderProjectItems) {}

    async handle(request: ReorderProjectItemsRequest): Promise<void> {
        await this.useCase.execute(request);
    }
}
