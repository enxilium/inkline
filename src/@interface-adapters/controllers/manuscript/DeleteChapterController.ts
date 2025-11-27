import { Controller } from "../Controller";
import { DeleteChapter } from "../../../@core/application/use-cases/manuscript/DeleteChapter";

export class DeleteChapterController
    implements
        Controller<
            Parameters<DeleteChapter["execute"]>,
            Awaited<ReturnType<DeleteChapter["execute"]>>
        >
{
    constructor(private readonly deleteChapter: DeleteChapter) {}

    async handle(
        ...args: Parameters<DeleteChapter["execute"]>
    ): Promise<Awaited<ReturnType<DeleteChapter["execute"]>>> {
        return this.deleteChapter.execute(...args);
    }
}
