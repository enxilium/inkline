import { CreateEvent } from "../../../@core/application/use-cases/timeline/CreateEvent";
import { Controller } from "../Controller";

export class CreateEventController
    implements
        Controller<
            Parameters<CreateEvent["execute"]>,
            Awaited<ReturnType<CreateEvent["execute"]>>
        >
{
    constructor(private readonly createEvent: CreateEvent) {}

    async handle(
        ...args: Parameters<CreateEvent["execute"]>
    ): Promise<Awaited<ReturnType<CreateEvent["execute"]>>> {
        return this.createEvent.execute(...args);
    }
}
