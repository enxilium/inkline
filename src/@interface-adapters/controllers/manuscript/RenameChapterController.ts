import { Controller } from "../Controller";
import { RenameChapter } from "../../../@core/application/use-cases/manuscript/RenameChapter";

export class RenameChapterController
    implements
        Controller<
            Parameters<RenameChapter["execute"]>,
            Awaited<ReturnType<RenameChapter["execute"]>>
        >
{
    constructor(private readonly renameChapter: RenameChapter) {}

    async handle(
        ...args: Parameters<RenameChapter["execute"]>
    ): Promise<Awaited<ReturnType<RenameChapter["execute"]>>> {
        return this.renameChapter.execute(...args);
    }
}
