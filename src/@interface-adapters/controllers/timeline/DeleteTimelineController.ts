import { DeleteTimeline } from "../../../@core/application/use-cases/timeline/DeleteTimeline";
import { Controller } from "../Controller";

export class DeleteTimelineController
    implements
        Controller<
            Parameters<DeleteTimeline["execute"]>,
            Awaited<ReturnType<DeleteTimeline["execute"]>>
        >
{
    constructor(private readonly deleteTimeline: DeleteTimeline) {}

    async handle(
        ...args: Parameters<DeleteTimeline["execute"]>
    ): Promise<Awaited<ReturnType<DeleteTimeline["execute"]>>> {
        return this.deleteTimeline.execute(...args);
    }
}
