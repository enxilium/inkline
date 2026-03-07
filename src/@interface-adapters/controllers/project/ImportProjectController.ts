import { IpcMainInvokeEvent } from "electron";
import { IpcController } from "../Controller";
import {
    ImportProject,
    ImportProjectRequest,
    ImportProjectResponse,
} from "../../../@core/application/use-cases/project/ImportProject";

export class ImportProjectController implements IpcController<
    [ImportProjectRequest],
    ImportProjectResponse
> {
    constructor(private readonly importProject: ImportProject) {}

    async handle(
        request: ImportProjectRequest,
    ): Promise<ImportProjectResponse> {
        return this.importProject.execute(request);
    }

    async handleWithEvent(
        event: IpcMainInvokeEvent,
        request: ImportProjectRequest,
    ): Promise<ImportProjectResponse> {
        return this.importProject.execute(request, (percent) => {
            event.sender.send("import-progress", { progress: percent });
        });
    }
}
