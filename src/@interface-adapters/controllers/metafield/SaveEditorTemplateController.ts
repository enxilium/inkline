import { Controller } from "../Controller";
import { SaveEditorTemplate } from "../../../@core/application/use-cases/metafield/SaveEditorTemplate";

export class SaveEditorTemplateController implements Controller<
    Parameters<SaveEditorTemplate["execute"]>,
    Awaited<ReturnType<SaveEditorTemplate["execute"]>>
> {
    constructor(private readonly saveEditorTemplate: SaveEditorTemplate) {}

    async handle(
        ...args: Parameters<SaveEditorTemplate["execute"]>
    ): Promise<Awaited<ReturnType<SaveEditorTemplate["execute"]>>> {
        return this.saveEditorTemplate.execute(...args);
    }
}
