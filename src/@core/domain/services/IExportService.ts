import { Chapter } from "../entities/story/Chapter";
import { Project } from "../entities/story/Project";

export interface IExportService {
    exportProject(
        project: Project,
        chapters: Chapter[],
        format: "pdf" | "epub" | "docx",
        path: string
    ): Promise<void>;
}
