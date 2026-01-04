import { UpdateTimeline } from "../../../@core/application/use-cases/timeline/UpdateTimeline";
import { Controller } from "../Controller";

export class UpdateTimelineController
    implements
        Controller<
            Parameters<UpdateTimeline["execute"]>,
            Awaited<ReturnType<UpdateTimeline["execute"]>>
        >
{
    constructor(private readonly updateTimeline: UpdateTimeline) {}

    async handle(
        ...args: Parameters<UpdateTimeline["execute"]>
    ): Promise<Awaited<ReturnType<UpdateTimeline["execute"]>>> {
        return this.updateTimeline.execute(...args);
    }
}
