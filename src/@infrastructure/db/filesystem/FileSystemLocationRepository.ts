import { ILocationRepository } from "../../../@core/domain/repositories/ILocationRepository";
import { Location } from "../../../@core/domain/entities/story/world/Location";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemLocation = {
    id: string;
    projectId: string;
    name: string;
    description: string;
    culture: string;
    history: string;
    conflicts: string[];
    tags: string[];
    createdAt: string;
    updatedAt: string;
    bgmId: string | null;
    playlistId: string | null;
    galleryImageIds: string[];
    characterIds: string[];
    organizationIds: string[];
};

export class FileSystemLocationRepository implements ILocationRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        locationId: string
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "locations",
            `${locationId}.json`
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", projectId, "locations");
    }

    async create(projectId: string, location: Location): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;

        const dto: FileSystemLocation = {
            id: location.id,
            projectId: projectId,
            name: location.name,
            description: location.description,
            culture: location.culture,
            history: location.history,
            conflicts: location.conflicts,
            tags: location.tags,
            createdAt: location.createdAt.toISOString(),
            updatedAt: location.updatedAt.toISOString(),
            bgmId: location.bgmId,
            playlistId: location.playlistId,
            galleryImageIds: location.galleryImageIds,
            characterIds: location.characterIds,
            organizationIds: location.organizationIds,
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, location.id),
            dto
        );
    }

    async findById(id: string): Promise<Location | null> {
        const loc = await this.findFileLocation(id);
        if (loc) {
            const dto = await fileSystemService.readJson<FileSystemLocation>(
                loc.path
            );
            if (dto) return this.mapToEntity(dto);
        }
        return null;
    }

    async findByProjectId(projectId: string): Promise<Location[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const locations: Location[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto =
                    await fileSystemService.readJson<FileSystemLocation>(
                        path.join(dirPath, file)
                    );
                if (dto) locations.push(this.mapToEntity(dto));
            }
        }
        return locations;
    }

    async getLocationProfiles(
        projectId: string
    ): Promise<{ id: string; name: string; description: string }[]> {
        const locations = await this.findByProjectId(projectId);
        return locations.map((l) => ({
            id: l.id,
            name: l.name,
            description: l.description,
        }));
    }

    async update(location: Location): Promise<void> {
        const loc = await this.findFileLocation(location.id);
        if (loc) {
            const dto: FileSystemLocation = {
                id: location.id,
                projectId: loc.projectId,
                name: location.name,
                description: location.description,
                culture: location.culture,
                history: location.history,
                conflicts: location.conflicts,
                tags: location.tags,
                createdAt: location.createdAt.toISOString(),
                updatedAt: location.updatedAt.toISOString(),
                bgmId: location.bgmId,
                playlistId: location.playlistId,
                galleryImageIds: location.galleryImageIds,
                characterIds: location.characterIds,
                organizationIds: location.organizationIds,
            };
            await fileSystemService.writeJson(loc.path, dto);
        }
    }

    async delete(id: string): Promise<void> {
        const loc = await this.findFileLocation(id);
        if (loc) {
            await fileSystemService.deleteFile(loc.path);
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        for (const file of files) {
            await fileSystemService.deleteFile(path.join(dirPath, file));
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
        locationId: string
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);
            for (const projectFile of projects) {
                if (projectFile.endsWith(".json")) {
                    const projectId = projectFile.replace(".json", "");
                    const locPath = this.getFilePath(
                        user,
                        projectId,
                        locationId
                    );
                    if (await fileSystemService.exists(locPath)) {
                        return { userId: user, projectId, path: locPath };
                    }
                }
            }
        }
        return null;
    }

    private mapToEntity(dto: FileSystemLocation): Location {
        return new Location(
            dto.id,
            dto.name,
            dto.description,
            dto.culture,
            dto.history,
            dto.conflicts,
            dto.tags,
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
            dto.bgmId,
            dto.playlistId,
            dto.galleryImageIds,
            dto.characterIds,
            dto.organizationIds
        );
    }
}
