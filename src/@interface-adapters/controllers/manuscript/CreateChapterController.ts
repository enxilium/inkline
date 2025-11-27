import { Controller } from "../Controller";
import { CreateChapter } from "../../../@core/application/use-cases/manuscript/CreateChapter";

export class CreateChapterController
    implements
        Controller<
            Parameters<CreateChapter["execute"]>,
            Awaited<ReturnType<CreateChapter["execute"]>>
        >
{
    constructor(private readonly createChapter: CreateChapter) {}

    async handle(
        ...args: Parameters<CreateChapter["execute"]>
    ): Promise<Awaited<ReturnType<CreateChapter["execute"]>>> {
        return this.createChapter.execute(...args);
    }
}
