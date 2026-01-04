import { CreateTimeline } from "../../../@core/application/use-cases/timeline/CreateTimeline";
import { Controller } from "../Controller";

export class CreateTimelineController
    implements
        Controller<
            Parameters<CreateTimeline["execute"]>,
            Awaited<ReturnType<CreateTimeline["execute"]>>
        >
{
    constructor(private readonly createTimeline: CreateTimeline) {}

    async handle(
        ...args: Parameters<CreateTimeline["execute"]>
    ): Promise<Awaited<ReturnType<CreateTimeline["execute"]>>> {
        return this.createTimeline.execute(...args);
    }
}
