import {
    MetafieldDefinition,
    MetafieldScope,
} from "../../../@core/domain/entities/story/world/MetafieldDefinition";
import { IMetafieldDefinitionRepository } from "../../../@core/domain/repositories/IMetafieldDefinitionRepository";
import { normalizeMetafieldName } from "../../../@core/application/utils/normalizeMetafieldName";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemMetafieldDefinition = {
    id: string;
    projectId: string;
    name: string;
    nameNormalized: string;
    scope: MetafieldScope;
    valueType:
        | "string"
        | "string[]"
        | "entity"
        | "entity[]"
        | "image"
        | "image[]";
    targetEntityKind: "character" | "location" | "organization" | null;
    createdAt: string;
    updatedAt: string;
};

export class FileSystemMetafieldDefinitionRepository implements IMetafieldDefinitionRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        definitionId: string,
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "metafield-definitions",
            `${definitionId}.json`,
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "metafield-definitions",
        );
    }

    async create(definition: MetafieldDefinition): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(definition.projectId);
        if (!ownerId) return;

        await fileSystemService.writeJson(
            this.getFilePath(ownerId, definition.projectId, definition.id),
            this.toDto(definition),
        );
    }

    async findById(id: string): Promise<MetafieldDefinition | null> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return null;
        }

        const dto =
            await fileSystemService.readJson<FileSystemMetafieldDefinition>(
                location.path,
            );
        return dto ? this.mapToEntity(dto) : null;
    }

    async findByProjectId(projectId: string): Promise<MetafieldDefinition[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const definitions: MetafieldDefinition[] = [];

        for (const file of files) {
            if (!file.endsWith(".json")) continue;
            const dto =
                await fileSystemService.readJson<FileSystemMetafieldDefinition>(
                    path.join(dirPath, file),
                );
            if (dto) {
                definitions.push(this.mapToEntity(dto));
            }
        }

        return definitions.sort((a, b) => a.name.localeCompare(b.name));
    }

    async findByProjectAndNameNormalized(
        projectId: string,
        nameNormalized: string,
    ): Promise<MetafieldDefinition | null> {
        const normalized = normalizeMetafieldName(nameNormalized);
        const definitions = await this.findByProjectId(projectId);
        return (
            definitions.find(
                (definition) =>
                    normalizeMetafieldName(definition.nameNormalized) ===
                    normalized,
            ) ?? null
        );
    }

    async findByProjectAndScope(
        projectId: string,
        scope: MetafieldScope,
    ): Promise<MetafieldDefinition[]> {
        const definitions = await this.findByProjectId(projectId);
        return definitions.filter((definition) => definition.scope === scope);
    }

    async update(definition: MetafieldDefinition): Promise<void> {
        const location = await this.findFileLocation(definition.id);
        if (!location) {
            return;
        }

        await fileSystemService.writeJson(
            location.path,
            this.toDto(definition),
        );
    }

    async delete(id: string): Promise<void> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return;
        }

        await fileSystemService.deleteFile(location.path);
    }

    private toDto(
        definition: MetafieldDefinition,
    ): FileSystemMetafieldDefinition {
        const normalized = normalizeMetafieldName(definition.name);
        return {
            id: definition.id,
            projectId: definition.projectId,
            name: definition.name,
            nameNormalized: normalized,
            scope: definition.scope,
            valueType: definition.valueType,
            targetEntityKind: definition.targetEntityKind,
            createdAt: definition.createdAt.toISOString(),
            updatedAt: definition.updatedAt.toISOString(),
        };
    }

    private async findOwnerIdByProjectId(
        projectId: string,
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");

        for (const user of users) {
            const projectPath = path.join(
                "users",
                user,
                "projects",
                `${projectId}.json`,
            );

            if (await fileSystemService.exists(projectPath)) {
                return user;
            }
        }

        return null;
    }

    private async findFileLocation(
        definitionId: string,
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");

        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);

            for (const projectFile of projects) {
                if (!projectFile.endsWith(".json")) continue;

                const projectId = projectFile.replace(".json", "");
                const filePath = this.getFilePath(
                    user,
                    projectId,
                    definitionId,
                );

                if (await fileSystemService.exists(filePath)) {
                    return { userId: user, projectId, path: filePath };
                }
            }
        }

        return null;
    }

    private mapToEntity(
        dto: FileSystemMetafieldDefinition,
    ): MetafieldDefinition {
        return new MetafieldDefinition(
            dto.id,
            dto.projectId,
            dto.name,
            dto.nameNormalized,
            dto.scope,
            dto.valueType,
            dto.targetEntityKind,
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
        );
    }
}
