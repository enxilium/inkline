import { Controller } from "../Controller";
import { GlobalFindAndReplace } from "../../../@core/application/use-cases/manuscript/GlobalFindAndReplace";

export class GlobalFindAndReplaceController
    implements
        Controller<
            Parameters<GlobalFindAndReplace["execute"]>,
            Awaited<ReturnType<GlobalFindAndReplace["execute"]>>
        >
{
    constructor(private readonly globalFindAndReplace: GlobalFindAndReplace) {}

    async handle(
        ...args: Parameters<GlobalFindAndReplace["execute"]>
    ): Promise<Awaited<ReturnType<GlobalFindAndReplace["execute"]>>> {
        return this.globalFindAndReplace.execute(...args);
    }
}
