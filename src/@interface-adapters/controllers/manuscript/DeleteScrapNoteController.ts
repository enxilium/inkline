import { Controller } from "../Controller";
import { DeleteScrapNote } from "../../../@core/application/use-cases/manuscript/DeleteScrapNote";

export class DeleteScrapNoteController
    implements
        Controller<
            Parameters<DeleteScrapNote["execute"]>,
            Awaited<ReturnType<DeleteScrapNote["execute"]>>
        >
{
    constructor(private readonly deleteScrapNote: DeleteScrapNote) {}

    async handle(
        ...args: Parameters<DeleteScrapNote["execute"]>
    ): Promise<Awaited<ReturnType<DeleteScrapNote["execute"]>>> {
        return this.deleteScrapNote.execute(...args);
    }
}
