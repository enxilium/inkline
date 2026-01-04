import { DeleteEvent } from "../../../@core/application/use-cases/timeline/DeleteEvent";
import { Controller } from "../Controller";

export class DeleteEventController
    implements
        Controller<
            Parameters<DeleteEvent["execute"]>,
            Awaited<ReturnType<DeleteEvent["execute"]>>
        >
{
    constructor(private readonly deleteEvent: DeleteEvent) {}

    async handle(
        ...args: Parameters<DeleteEvent["execute"]>
    ): Promise<Awaited<ReturnType<DeleteEvent["execute"]>>> {
        return this.deleteEvent.execute(...args);
    }
}
