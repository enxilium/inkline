import { Controller } from "../Controller";
import { SaveChapterContent } from "../../../@core/application/use-cases/logistics/SaveChapterContent";

export class SaveChapterContentController
    implements
        Controller<
            Parameters<SaveChapterContent["execute"]>,
            Awaited<ReturnType<SaveChapterContent["execute"]>>
        >
{
    constructor(private readonly saveChapterContent: SaveChapterContent) {}

    async handle(
        ...args: Parameters<SaveChapterContent["execute"]>
    ): Promise<Awaited<ReturnType<SaveChapterContent["execute"]>>> {
        return this.saveChapterContent.execute(...args);
    }
}
