import { Controller } from "../Controller";
import { LoadProjectList } from "../../../@core/application/use-cases/project/LoadProjectList";

export class LoadProjectListController
    implements
        Controller<
            Parameters<LoadProjectList["execute"]>,
            Awaited<ReturnType<LoadProjectList["execute"]>>
        >
{
    constructor(private readonly loadProjectList: LoadProjectList) {}

    async handle(
        ...args: Parameters<LoadProjectList["execute"]>
    ): Promise<Awaited<ReturnType<LoadProjectList["execute"]>>> {
        return this.loadProjectList.execute(...args);
    }
}
