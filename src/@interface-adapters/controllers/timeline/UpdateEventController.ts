import { UpdateEvent } from "../../../@core/application/use-cases/timeline/UpdateEvent";
import { Controller } from "../Controller";

export class UpdateEventController
    implements
        Controller<
            Parameters<UpdateEvent["execute"]>,
            Awaited<ReturnType<UpdateEvent["execute"]>>
        >
{
    constructor(private readonly updateEvent: UpdateEvent) {}

    async handle(
        ...args: Parameters<UpdateEvent["execute"]>
    ): Promise<Awaited<ReturnType<UpdateEvent["execute"]>>> {
        return this.updateEvent.execute(...args);
    }
}
