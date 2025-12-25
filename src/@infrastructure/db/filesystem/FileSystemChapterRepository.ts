import { IChapterRepository } from "../../../@core/domain/repositories/IChapterRepository";
import { Chapter } from "../../../@core/domain/entities/story/Chapter";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemChapter = {
    id: string;
    projectId: string;
    title: string;
    order: number;
    content: any;
    createdAt: string;
    updatedAt: string;
};

export class FileSystemChapterRepository implements IChapterRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        chapterId: string
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "chapters",
            `${chapterId}.json`
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", projectId, "chapters");
    }

    async create(projectId: string, chapter: Chapter): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) {
            // If we can't find the project owner locally, we can't save the chapter locally?
            // This implies the project must exist locally first.
            // Which is true.
            console.warn(
                `Cannot create chapter ${chapter.id}: Project ${projectId} not found locally.`
            );
            return;
        }

        const dto: FileSystemChapter = {
            id: chapter.id,
            projectId: projectId,
            title: chapter.title,
            order: chapter.order,
            content: JSON.parse(chapter.content),
            createdAt: chapter.createdAt.toISOString(),
            updatedAt: chapter.updatedAt.toISOString(),
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, chapter.id),
            dto
        );
    }

    async findById(id: string): Promise<Chapter | null> {
        const location = await this.findFileLocation(id);
        if (location) {
            const dto = await fileSystemService.readJson<FileSystemChapter>(
                location.path
            );
            if (dto) return this.mapToEntity(dto);
        }
        return null;
    }

    async findByProjectId(projectId: string): Promise<Chapter[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const chapters: Chapter[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto = await fileSystemService.readJson<FileSystemChapter>(
                    path.join(dirPath, file)
                );
                if (dto) chapters.push(this.mapToEntity(dto));
            }
        }
        return chapters.sort((a, b) => a.order - b.order);
    }

    async updateContent(chapterId: string, content: string): Promise<void> {
        const chapter = await this.findById(chapterId);
        if (chapter) {
            chapter.content = content;
            chapter.updatedAt = new Date();
            await this.update(chapter);
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (ownerId) {
            const dirPath = this.getDirectoryPath(ownerId, projectId);
            await fileSystemService.deleteDirectory(dirPath);
        }
    }

    async update(chapter: Chapter): Promise<void> {
        const location = await this.findFileLocation(chapter.id);
        if (location) {
            const dto: FileSystemChapter = {
                id: chapter.id,
                projectId: location.projectId,
                title: chapter.title,
                order: chapter.order,
                content: JSON.parse(chapter.content),
                createdAt: chapter.createdAt.toISOString(),
                updatedAt: chapter.updatedAt.toISOString(),
            };
            await fileSystemService.writeJson(location.path, dto);
        }
    }

    async delete(id: string): Promise<void> {
        const location = await this.findFileLocation(id);
        if (location) {
            await fileSystemService.deleteFile(location.path);
        }
    }

    private async findOwnerIdByProjectId(
        projectId: string
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectPath = path.join(
                "users",
                user,
                "projects",
                `${projectId}.json`
            );
            if (await fileSystemService.exists(projectPath)) {
                return user;
            }
        }
        return null;
    }

    private async findFileLocation(
        chapterId: string
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        // This is expensive. We iterate all users -> all projects -> all chapters?
        // Or we can iterate all users -> all projects -> check if chapter file exists?
        // Path is .../chapters/{chapterId}.json
        // So we need to know projectId.

        // Optimization: If we have many projects, this is slow.
        // But for a single user on desktop, it's okay.

        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);
            // projects contains .json files and folders (if we used folders for projects)
            // Wait, I stored project as `projects/{projectId}.json`.
            // But I also need a folder for the project to store chapters?
            // `users/{userId}/projects/{projectId}/chapters/...`
            // So I need a folder `users/{userId}/projects/{projectId}`.

            // In FileSystemProjectRepository, I used `projects/{projectId}.json`.
            // I didn't create a folder for the project.
            // I should probably create a folder `projects/{projectId}` and put `project.json` inside it?
            // Or keep `project.json` and create a folder `projects/{projectId}` for assets/chapters?

            // Let's assume `projects/{projectId}` folder exists for chapters.

            for (const projectFile of projects) {
                if (projectFile.endsWith(".json")) {
                    const projectId = projectFile.replace(".json", "");
                    const chapterPath = this.getFilePath(
                        user,
                        projectId,
                        chapterId
                    );
                    if (await fileSystemService.exists(chapterPath)) {
                        return { userId: user, projectId, path: chapterPath };
                    }
                }
            }
        }
        return null;
    }

    private mapToEntity(dto: FileSystemChapter): Chapter {
        return new Chapter(
            dto.id,
            dto.title,
            dto.order,
            JSON.stringify(dto.content),
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }
}
