import { Controller } from "../Controller";
import { GlobalFind } from "../../../@core/application/use-cases/manuscript/GlobalFind";

export class GlobalFindController
    implements
        Controller<
            Parameters<GlobalFind["execute"]>,
            Awaited<ReturnType<GlobalFind["execute"]>>
        >
{
    constructor(private readonly globalFind: GlobalFind) {}

    async handle(
        ...args: Parameters<GlobalFind["execute"]>
    ): Promise<Awaited<ReturnType<GlobalFind["execute"]>>> {
        return this.globalFind.execute(...args);
    }
}
