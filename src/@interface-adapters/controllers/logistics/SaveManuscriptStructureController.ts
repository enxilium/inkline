import { Controller } from "../Controller";
import { SaveManuscriptStructure } from "../../../@core/application/use-cases/logistics/SaveManuscriptStructure";

export class SaveManuscriptStructureController
    implements
        Controller<
            Parameters<SaveManuscriptStructure["execute"]>,
            Awaited<ReturnType<SaveManuscriptStructure["execute"]>>
        >
{
    constructor(
        private readonly saveManuscriptStructure: SaveManuscriptStructure
    ) {}

    async handle(
        ...args: Parameters<SaveManuscriptStructure["execute"]>
    ): Promise<Awaited<ReturnType<SaveManuscriptStructure["execute"]>>> {
        return this.saveManuscriptStructure.execute(...args);
    }
}
