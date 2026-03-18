import {
    MetafieldAssignment,
    MetafieldAssignableEntityType,
} from "../../../@core/domain/entities/story/world/MetafieldAssignment";
import { IMetafieldAssignmentRepository } from "../../../@core/domain/repositories/IMetafieldAssignmentRepository";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemMetafieldAssignment = {
    id: string;
    projectId: string;
    definitionId: string;
    entityType: MetafieldAssignableEntityType;
    entityId: string;
    valueJson: unknown;
    orderIndex: number;
    createdAt: string;
    updatedAt: string;
};

export class FileSystemMetafieldAssignmentRepository implements IMetafieldAssignmentRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        assignmentId: string,
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "metafield-assignments",
            `${assignmentId}.json`,
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "metafield-assignments",
        );
    }

    async create(assignment: MetafieldAssignment): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(assignment.projectId);
        if (!ownerId) return;

        await fileSystemService.writeJson(
            this.getFilePath(ownerId, assignment.projectId, assignment.id),
            this.toDto(assignment),
        );
    }

    async findById(id: string): Promise<MetafieldAssignment | null> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return null;
        }

        const dto =
            await fileSystemService.readJson<FileSystemMetafieldAssignment>(
                location.path,
            );
        return dto ? this.mapToEntity(dto) : null;
    }

    async findByProjectId(projectId: string): Promise<MetafieldAssignment[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const assignments: MetafieldAssignment[] = [];

        for (const file of files) {
            if (!file.endsWith(".json")) continue;
            const dto =
                await fileSystemService.readJson<FileSystemMetafieldAssignment>(
                    path.join(dirPath, file),
                );
            if (dto) {
                assignments.push(this.mapToEntity(dto));
            }
        }

        return assignments.sort(
            (a, b) =>
                a.orderIndex - b.orderIndex ||
                a.createdAt.getTime() - b.createdAt.getTime(),
        );
    }

    async findAll(): Promise<MetafieldAssignment[]> {
        return this.findAllAssignments();
    }

    async findByDefinitionId(
        definitionId: string,
    ): Promise<MetafieldAssignment[]> {
        const allAssignments = await this.findAllAssignments();
        return allAssignments
            .filter((assignment) => assignment.definitionId === definitionId)
            .sort(
                (a, b) =>
                    a.orderIndex - b.orderIndex ||
                    a.createdAt.getTime() - b.createdAt.getTime(),
            );
    }

    async findByEntity(
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment[]> {
        const allAssignments = await this.findAllAssignments();
        return allAssignments
            .filter(
                (assignment) =>
                    assignment.entityType === entityType &&
                    assignment.entityId === entityId,
            )
            .sort(
                (a, b) =>
                    a.orderIndex - b.orderIndex ||
                    a.createdAt.getTime() - b.createdAt.getTime(),
            );
    }

    async findByDefinitionAndEntity(
        definitionId: string,
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment | null> {
        const allAssignments = await this.findAllAssignments();
        return (
            allAssignments.find(
                (assignment) =>
                    assignment.definitionId === definitionId &&
                    assignment.entityType === entityType &&
                    assignment.entityId === entityId,
            ) ?? null
        );
    }

    async update(assignment: MetafieldAssignment): Promise<void> {
        const location = await this.findFileLocation(assignment.id);
        if (!location) {
            return;
        }

        await fileSystemService.writeJson(
            location.path,
            this.toDto(assignment),
        );
    }

    async delete(id: string): Promise<void> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return;
        }

        await fileSystemService.deleteFile(location.path);
    }

    async deleteByDefinitionId(definitionId: string): Promise<void> {
        const assignments = await this.findByDefinitionId(definitionId);
        for (const assignment of assignments) {
            await this.delete(assignment.id);
        }
    }

    private toDto(
        assignment: MetafieldAssignment,
    ): FileSystemMetafieldAssignment {
        return {
            id: assignment.id,
            projectId: assignment.projectId,
            definitionId: assignment.definitionId,
            entityType: assignment.entityType,
            entityId: assignment.entityId,
            valueJson: assignment.valueJson,
            orderIndex: assignment.orderIndex,
            createdAt: assignment.createdAt.toISOString(),
            updatedAt: assignment.updatedAt.toISOString(),
        };
    }

    private async findAllAssignments(): Promise<MetafieldAssignment[]> {
        const users = await fileSystemService.listFiles("users");
        const assignments: MetafieldAssignment[] = [];

        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);

            for (const projectFile of projects) {
                if (!projectFile.endsWith(".json")) continue;

                const projectId = projectFile.replace(".json", "");
                const dirPath = this.getDirectoryPath(user, projectId);
                const files = await fileSystemService.listFiles(dirPath);

                for (const file of files) {
                    if (!file.endsWith(".json")) continue;
                    const dto =
                        await fileSystemService.readJson<FileSystemMetafieldAssignment>(
                            path.join(dirPath, file),
                        );
                    if (dto) {
                        assignments.push(this.mapToEntity(dto));
                    }
                }
            }
        }

        return assignments;
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
        assignmentId: string,
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
                    assignmentId,
                );

                if (await fileSystemService.exists(filePath)) {
                    return { userId: user, projectId, path: filePath };
                }
            }
        }

        return null;
    }

    private mapToEntity(
        dto: FileSystemMetafieldAssignment,
    ): MetafieldAssignment {
        return new MetafieldAssignment(
            dto.id,
            dto.projectId,
            dto.definitionId,
            dto.entityType,
            dto.entityId,
            dto.valueJson,
            dto.orderIndex ?? 0,
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
        );
    }
}
