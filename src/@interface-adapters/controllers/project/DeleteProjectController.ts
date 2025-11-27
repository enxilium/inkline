import { Controller } from "../Controller";
import { DeleteProject } from "../../../@core/application/use-cases/project/DeleteProject";

export class DeleteProjectController
    implements
        Controller<
            Parameters<DeleteProject["execute"]>,
            Awaited<ReturnType<DeleteProject["execute"]>>
        >
{
    constructor(private readonly deleteProject: DeleteProject) {}

    async handle(
        ...args: Parameters<DeleteProject["execute"]>
    ): Promise<Awaited<ReturnType<DeleteProject["execute"]>>> {
        return this.deleteProject.execute(...args);
    }
}
