import { Controller } from "../Controller";
import { EditChapters } from "../../../@core/application/use-cases/analysis/EditChapters";

export class EditChaptersController
    implements
        Controller<
            Parameters<EditChapters["execute"]>,
            Awaited<ReturnType<EditChapters["execute"]>>
        >
{
    constructor(private readonly editChapters: EditChapters) {}

    async handle(
        ...args: Parameters<EditChapters["execute"]>
    ): Promise<Awaited<ReturnType<EditChapters["execute"]>>> {
        return this.editChapters.execute(...args);
    }
}
