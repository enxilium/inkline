import { Controller } from "../Controller";
import { OpenProject } from "../../../@core/application/use-cases/project/OpenProject";

export class OpenProjectController
    implements
        Controller<
            Parameters<OpenProject["execute"]>,
            Awaited<ReturnType<OpenProject["execute"]>>
        >
{
    constructor(private readonly openProject: OpenProject) {}

    async handle(
        ...args: Parameters<OpenProject["execute"]>
    ): Promise<Awaited<ReturnType<OpenProject["execute"]>>> {
        return this.openProject.execute(...args);
    }
}
