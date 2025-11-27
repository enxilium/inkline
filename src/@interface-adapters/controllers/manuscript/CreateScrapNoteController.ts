import { Controller } from "../Controller";
import { CreateScrapNote } from "../../../@core/application/use-cases/manuscript/CreateScrapNote";

export class CreateScrapNoteController
    implements
        Controller<
            Parameters<CreateScrapNote["execute"]>,
            Awaited<ReturnType<CreateScrapNote["execute"]>>
        >
{
    constructor(private readonly createScrapNote: CreateScrapNote) {}

    async handle(
        ...args: Parameters<CreateScrapNote["execute"]>
    ): Promise<Awaited<ReturnType<CreateScrapNote["execute"]>>> {
        return this.createScrapNote.execute(...args);
    }
}
