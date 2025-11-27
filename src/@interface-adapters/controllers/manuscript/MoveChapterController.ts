import { Controller } from "../Controller";
import { MoveChapter } from "../../../@core/application/use-cases/manuscript/MoveChapter";

export class MoveChapterController
    implements
        Controller<
            Parameters<MoveChapter["execute"]>,
            Awaited<ReturnType<MoveChapter["execute"]>>
        >
{
    constructor(private readonly moveChapter: MoveChapter) {}

    async handle(
        ...args: Parameters<MoveChapter["execute"]>
    ): Promise<Awaited<ReturnType<MoveChapter["execute"]>>> {
        return this.moveChapter.execute(...args);
    }
}
