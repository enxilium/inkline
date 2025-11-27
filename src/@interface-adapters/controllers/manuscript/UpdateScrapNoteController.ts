import { Controller } from "../Controller";
import { UpdateScrapNote } from "../../../@core/application/use-cases/manuscript/UpdateScrapNote";

export class UpdateScrapNoteController
    implements
        Controller<
            Parameters<UpdateScrapNote["execute"]>,
            Awaited<ReturnType<UpdateScrapNote["execute"]>>
        >
{
    constructor(private readonly updateScrapNote: UpdateScrapNote) {}

    async handle(
        ...args: Parameters<UpdateScrapNote["execute"]>
    ): Promise<Awaited<ReturnType<UpdateScrapNote["execute"]>>> {
        return this.updateScrapNote.execute(...args);
    }
}
