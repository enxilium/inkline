import { Controller } from "../Controller";
import { RenameProject } from "../../../@core/application/use-cases/project/RenameProject";

export class RenameProjectController
    implements
        Controller<
            Parameters<RenameProject["execute"]>,
            Awaited<ReturnType<RenameProject["execute"]>>
        >
{
    constructor(private readonly renameProject: RenameProject) {}

    async handle(
        ...args: Parameters<RenameProject["execute"]>
    ): Promise<Awaited<ReturnType<RenameProject["execute"]>>> {
        return this.renameProject.execute(...args);
    }
}
