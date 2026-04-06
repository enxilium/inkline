import { ITimelineRepository } from "../../../@core/domain/repositories/ITimelineRepository";
import { Timeline } from "../../../@core/domain/entities/story/timeline/Timeline";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemTimeline = {
    id: string;
    projectId: string;
    name: string;
    description: string;
    timeUnit: string;
    startValue: number;
    eventIds: string[];
    createdAt: string;
    updatedAt: string;
};

export class FileSystemTimelineRepository implements ITimelineRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        timelineId: string,
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "timelines",
            `${timelineId}.json`,
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", projectId, "timelines");
    }

    async create(projectId: string, timeline: Timeline): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) {
            console.warn(
                `Cannot create timeline ${timeline.id}: Project ${projectId} not found locally.`,
            );
            return;
        }

        const dto: FileSystemTimeline = {
            id: timeline.id,
            projectId,
            name: timeline.name,
            description: timeline.description,
            timeUnit: timeline.timeUnit,
            startValue: timeline.startValue,
            eventIds: timeline.eventIds,
            createdAt: timeline.createdAt.toISOString(),
            updatedAt: timeline.updatedAt.toISOString(),
        };

        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, timeline.id),
            dto,
        );
    }

    async findById(id: string): Promise<Timeline | null> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return null;
        }

        const dto = await fileSystemService.readJson<FileSystemTimeline>(
            location.path,
        );
        return dto ? this.mapToEntity(dto) : null;
    }

    async findByProjectId(projectId: string): Promise<Timeline[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) {
            return [];
        }

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const timelines: Timeline[] = [];

        for (const file of files) {
            if (!file.endsWith(".json")) {
                continue;
            }

            const dto = await fileSystemService.readJson<FileSystemTimeline>(
                path.join(dirPath, file),
            );
            if (dto) {
                timelines.push(this.mapToEntity(dto));
            }
        }

        return timelines;
    }

    async update(timeline: Timeline): Promise<void> {
        const location = await this.findFileLocation(timeline.id);
        if (!location) {
            return;
        }

        const dto: FileSystemTimeline = {
            id: timeline.id,
            projectId: location.projectId,
            name: timeline.name,
            description: timeline.description,
            timeUnit: timeline.timeUnit,
            startValue: timeline.startValue,
            eventIds: timeline.eventIds,
            createdAt: timeline.createdAt.toISOString(),
            updatedAt: timeline.updatedAt.toISOString(),
        };

        await fileSystemService.writeJson(location.path, dto);
    }

    async delete(id: string): Promise<void> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return;
        }

        await fileSystemService.deleteFile(location.path);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) {
            return;
        }

        await fileSystemService.deleteDirectory(
            this.getDirectoryPath(ownerId, projectId),
        );
    }

    private async findOwnerIdByProjectId(
        projectId: string,
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");

        for (const userId of users) {
            const projectPath = path.join(
                "users",
                userId,
                "projects",
                `${projectId}.json`,
            );
            if (await fileSystemService.exists(projectPath)) {
                return userId;
            }
        }

        return null;
    }

    private async findFileLocation(
        timelineId: string,
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");

        for (const userId of users) {
            const projectsDir = path.join("users", userId, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);

            for (const projectFile of projects) {
                if (!projectFile.endsWith(".json")) {
                    continue;
                }

                const projectId = projectFile.replace(".json", "");
                const timelinePath = this.getFilePath(
                    userId,
                    projectId,
                    timelineId,
                );

                if (await fileSystemService.exists(timelinePath)) {
                    return {
                        userId,
                        projectId,
                        path: timelinePath,
                    };
                }
            }
        }

        return null;
    }

    private mapToEntity(dto: FileSystemTimeline): Timeline {
        return new Timeline(
            dto.id,
            dto.projectId,
            dto.name,
            dto.description,
            dto.timeUnit,
            dto.startValue,
            dto.eventIds,
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
        );
    }
}
