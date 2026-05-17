import { Controller } from "../Controller";
import { ExportDocument } from "../../../@core/application/use-cases/project/ExportDocument";

export class ExportDocumentController implements Controller<
    Parameters<ExportDocument["execute"]>,
    Awaited<ReturnType<ExportDocument["execute"]>>
> {
    constructor(private readonly useCase: ExportDocument) {}

    async handle(
        ...args: Parameters<ExportDocument["execute"]>
    ): Promise<Awaited<ReturnType<ExportDocument["execute"]>>> {
        return this.useCase.execute(...args);
    }
}
