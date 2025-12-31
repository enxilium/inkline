import { ICharacterRepository } from "../../../@core/domain/repositories/ICharacterRepository";
import { Character } from "../../../@core/domain/entities/story/world/Character";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemCharacter = {
    id: string;
    projectId: string;
    name: string;
    race: string;
    age: number | null;
    description: string;
    currentLocationId: string | null;
    backgroundLocationId: string | null;
    organizationId: string | null;
    traits: string[];
    goals: string[];
    secrets: string[];
    powers: { title: string; description: string }[];
    tags: string[];
    bgmId: string | null;
    playlistId: string | null;
    galleryImageIds: string[];
    createdAt: string;
    updatedAt: string;
};

export class FileSystemCharacterRepository implements ICharacterRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        characterId: string
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "characters",
            `${characterId}.json`
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", projectId, "characters");
    }

    async create(projectId: string, character: Character): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;

        const dto: FileSystemCharacter = {
            id: character.id,
            projectId: projectId,
            name: character.name,
            race: character.race,
            age: character.age,
            description: character.description,
            currentLocationId: character.currentLocationId,
            backgroundLocationId: character.backgroundLocationId,
            organizationId: character.organizationId,
            traits: character.traits,
            goals: character.goals,
            secrets: character.secrets,
            powers: character.powers,
            tags: character.tags,
            bgmId: character.bgmId,
            playlistId: character.playlistId,
            galleryImageIds: character.galleryImageIds,
            createdAt: character.createdAt.toISOString(),
            updatedAt: character.updatedAt.toISOString(),
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, character.id),
            dto
        );
    }

    async findById(id: string): Promise<Character | null> {
        const location = await this.findFileLocation(id);
        if (location) {
            const dto = await fileSystemService.readJson<FileSystemCharacter>(
                location.path
            );
            if (dto) return this.mapToEntity(dto);
        }
        return null;
    }

    async findByProjectId(projectId: string): Promise<Character[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const characters: Character[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto =
                    await fileSystemService.readJson<FileSystemCharacter>(
                        path.join(dirPath, file)
                    );
                if (dto) characters.push(this.mapToEntity(dto));
            }
        }
        return characters;
    }

    async update(character: Character): Promise<void> {
        const location = await this.findFileLocation(character.id);
        if (location) {
            const dto: FileSystemCharacter = {
                id: character.id,
                projectId: location.projectId,
                name: character.name,
                race: character.race,
                age: character.age,
                description: character.description,
                currentLocationId: character.currentLocationId,
                backgroundLocationId: character.backgroundLocationId,
                organizationId: character.organizationId,
                traits: character.traits,
                goals: character.goals,
                powers: character.powers,
                secrets: character.secrets,
                tags: character.tags,
                bgmId: character.bgmId,
                playlistId: character.playlistId,
                galleryImageIds: character.galleryImageIds,
                createdAt: character.createdAt.toISOString(),
                updatedAt: character.updatedAt.toISOString(),
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

    async deleteByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        for (const file of files) {
            await fileSystemService.deleteFile(path.join(dirPath, file));
        }
    }

    async getCharacterProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]> {
        const characters = await this.findByProjectId(projectId);
        return characters.map((c) => ({
            name: c.name,
            description: c.description,
        }));
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
        characterId: string
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);
            for (const projectFile of projects) {
                if (projectFile.endsWith(".json")) {
                    const projectId = projectFile.replace(".json", "");
                    const charPath = this.getFilePath(
                        user,
                        projectId,
                        characterId
                    );
                    if (await fileSystemService.exists(charPath)) {
                        return { userId: user, projectId, path: charPath };
                    }
                }
            }
        }
        return null;
    }

    private mapToEntity(dto: FileSystemCharacter): Character {
        return new Character(
            dto.id,
            dto.name,
            dto.race,
            dto.age,
            dto.description,
            dto.currentLocationId,
            dto.backgroundLocationId,
            dto.organizationId,
            dto.traits,
            dto.goals,
            dto.secrets,
            dto.powers || [],
            dto.tags,
            dto.bgmId,
            dto.playlistId,
            dto.galleryImageIds,
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }
}
