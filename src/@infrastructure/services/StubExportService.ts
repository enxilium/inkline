import { Chapter } from "../../@core/domain/entities/story/Chapter";
import { Project } from "../../@core/domain/entities/story/Project";
import { IExportService } from "../../@core/domain/services/IExportService";

const ERROR_MESSAGE = "Export is not available in this build.";

export class StubExportService implements IExportService {
    async exportProject(
        _project: Project,
        _chapters: Chapter[],
        _format: "pdf" | "epub" | "docx",
        _path: string
    ): Promise<void> {
        throw new Error(ERROR_MESSAGE);
    }
}
