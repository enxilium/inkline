import { Controller } from "../Controller";
import { ExportManuscript } from "../../../@core/application/use-cases/project/ExportManuscript";

export class ExportManuscriptController
    implements
        Controller<
            Parameters<ExportManuscript["execute"]>,
            Awaited<ReturnType<ExportManuscript["execute"]>>
        >
{
    constructor(private readonly exportManuscript: ExportManuscript) {}

    async handle(
        ...args: Parameters<ExportManuscript["execute"]>
    ): Promise<Awaited<ReturnType<ExportManuscript["execute"]>>> {
        return this.exportManuscript.execute(...args);
    }
}
