import { IScrapNoteRepository } from "../../../@core/domain/repositories/IScrapNoteRepository";
import { ScrapNote } from "../../../@core/domain/entities/story/ScrapNote";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemScrapNote = {
    id: string;
    projectId: string;
    title: string;
    content: string;
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
};

export class FileSystemScrapNoteRepository implements IScrapNoteRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        noteId: string
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "scrapnotes",
            `${noteId}.json`
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", projectId, "scrapnotes");
    }

    async create(projectId: string, note: ScrapNote): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;

        const dto: FileSystemScrapNote = {
            id: note.id,
            projectId: projectId,
            title: note.title,
            content: note.content,
            isPinned: note.isPinned,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, note.id),
            dto
        );
    }

    async findById(id: string): Promise<ScrapNote | null> {
        const loc = await this.findFileLocation(id);
        if (loc) {
            const dto = await fileSystemService.readJson<FileSystemScrapNote>(
                loc.path
            );
            if (dto) return this.mapToEntity(dto);
        }
        return null;
    }

    async findByProjectId(projectId: string): Promise<ScrapNote[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const notes: ScrapNote[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto =
                    await fileSystemService.readJson<FileSystemScrapNote>(
                        path.join(dirPath, file)
                    );
                if (dto) notes.push(this.mapToEntity(dto));
            }
        }
        return notes;
    }

    async updateContent(
        noteId: string,
        content: string,
        updatedAt?: Date
    ): Promise<void> {
        const note = await this.findById(noteId);
        if (note) {
            note.content = content;
            note.updatedAt = updatedAt || new Date();
            await this.update(note);
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (ownerId) {
            const dirPath = this.getDirectoryPath(ownerId, projectId);
            await fileSystemService.deleteDirectory(dirPath);
        }
    }

    async update(note: ScrapNote): Promise<void> {
        const loc = await this.findFileLocation(note.id);
        if (loc) {
            const dto: FileSystemScrapNote = {
                id: note.id,
                projectId: loc.projectId,
                title: note.title,
                content: note.content,
                isPinned: note.isPinned,
                createdAt: note.createdAt.toISOString(),
                updatedAt: note.updatedAt.toISOString(),
            };
            await fileSystemService.writeJson(loc.path, dto);
        }
    }

    async delete(id: string): Promise<void> {
        const loc = await this.findFileLocation(id);
        if (loc) await fileSystemService.deleteFile(loc.path);
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
        noteId: string
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);
            for (const projectFile of projects) {
                if (projectFile.endsWith(".json")) {
                    const projectId = projectFile.replace(".json", "");
                    const notePath = this.getFilePath(user, projectId, noteId);
                    if (await fileSystemService.exists(notePath)) {
                        return { userId: user, projectId, path: notePath };
                    }
                }
            }
        }
        return null;
    }

    private mapToEntity(dto: FileSystemScrapNote): ScrapNote {
        return new ScrapNote(
            dto.id,
            dto.title,
            dto.content,
            dto.isPinned,
            null,
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }
}
