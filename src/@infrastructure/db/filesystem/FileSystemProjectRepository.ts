import { IProjectRepository } from "../../../@core/domain/repositories/IProjectRepository";
import { Project } from "../../../@core/domain/entities/story/Project";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemProject = {
    id: string;
    title: string;
    coverImageId: string | null;
    chapterIds: string[];
    characterIds: string[];
    locationIds: string[];
    scrapNoteIds: string[];
    organizationIds: string[];
    createdAt: string;
    updatedAt: string;
    userId: string;
};

export class FileSystemProjectRepository implements IProjectRepository {
    private getFilePath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", `${projectId}.json`);
    }

    private getDirectoryPath(userId: string): string {
        return path.join("users", userId, "projects");
    }

    async create(ownerId: string, project: Project): Promise<void> {
        const dto: FileSystemProject = {
            id: project.id,
            title: project.title,
            coverImageId: project.coverImageId,
            chapterIds: project.chapterIds,
            characterIds: project.characterIds,
            locationIds: project.locationIds,
            scrapNoteIds: project.scrapNoteIds,
            organizationIds: project.organizationIds,
            createdAt: project.createdAt.toISOString(),
            updatedAt: project.updatedAt.toISOString(),
            userId: ownerId,
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, project.id),
            dto
        );
    }

    async findById(id: string): Promise<Project | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const filePath = this.getFilePath(user, id);
            if (await fileSystemService.exists(filePath)) {
                const dto =
                    await fileSystemService.readJson<FileSystemProject>(
                        filePath
                    );
                if (dto) return this.mapToEntity(dto);
            }
        }
        return null;
    }

    async findAllByUserId(userId: string): Promise<Project[]> {
        const dirPath = this.getDirectoryPath(userId);
        const files = await fileSystemService.listFiles(dirPath);
        const projects: Project[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto = await fileSystemService.readJson<FileSystemProject>(
                    path.join(dirPath, file)
                );
                if (dto) projects.push(this.mapToEntity(dto));
            }
        }
        return projects;
    }

    async update(project: Project): Promise<void> {
        const ownerId = await this.findOwnerId(project.id);
        if (ownerId) {
            const dto: FileSystemProject = {
                id: project.id,
                title: project.title,
                coverImageId: project.coverImageId,
                chapterIds: project.chapterIds,
                characterIds: project.characterIds,
                locationIds: project.locationIds,
                scrapNoteIds: project.scrapNoteIds,
                organizationIds: project.organizationIds,
                createdAt: project.createdAt.toISOString(),
                updatedAt: project.updatedAt.toISOString(),
                userId: ownerId,
            };
            await fileSystemService.writeJson(
                this.getFilePath(ownerId, project.id),
                dto
            );
        }
    }

    async delete(id: string): Promise<void> {
        const ownerId = await this.findOwnerId(id);
        if (ownerId) {
            await fileSystemService.deleteFile(this.getFilePath(ownerId, id));
        }
    }

    private async findOwnerId(projectId: string): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const filePath = this.getFilePath(user, projectId);
            if (await fileSystemService.exists(filePath)) {
                return user;
            }
        }
        return null;
    }

    private mapToEntity(dto: FileSystemProject): Project {
        return new Project(
            dto.id,
            dto.title,
            dto.coverImageId,
            dto.chapterIds,
            dto.characterIds,
            dto.locationIds,
            dto.scrapNoteIds,
            dto.organizationIds,
            [],
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }
}
