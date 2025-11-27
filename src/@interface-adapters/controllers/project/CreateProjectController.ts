import { Controller } from "../Controller";
import { CreateProject } from "../../../@core/application/use-cases/project/CreateProject";

export class CreateProjectController
    implements
        Controller<
            Parameters<CreateProject["execute"]>,
            Awaited<ReturnType<CreateProject["execute"]>>
        >
{
    constructor(private readonly createProject: CreateProject) {}

    async handle(
        ...args: Parameters<CreateProject["execute"]>
    ): Promise<Awaited<ReturnType<CreateProject["execute"]>>> {
        return this.createProject.execute(...args);
    }
}
