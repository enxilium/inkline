import { IEventRepository } from "../../../@core/domain/repositories/IEventRepository";
import {
    Event,
    EventType,
} from "../../../@core/domain/entities/story/timeline/Event";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemEvent = {
    id: string;
    projectId: string;
    timelineId: string;
    title: string;
    description: string;
    time: number;
    year: number;
    month: number | null;
    day: number | null;
    type: EventType;
    associatedId: string | null;
    characterIds: string[];
    locationIds: string[];
    organizationIds: string[];
    createdAt: string;
    updatedAt: string;
};

export class FileSystemEventRepository implements IEventRepository {
    private getFilePath(
        userId: string,
        projectId: string,
        eventId: string,
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "events",
            `${eventId}.json`,
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join("users", userId, "projects", projectId, "events");
    }

    private getTimelineFilePath(
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

    async create(timelineId: string, event: Event): Promise<void> {
        const timelineLocation = await this.findTimelineLocation(timelineId);
        if (!timelineLocation) {
            console.warn(
                `Cannot create event ${event.id}: Timeline ${timelineId} not found locally.`,
            );
            return;
        }

        const dto: FileSystemEvent = {
            id: event.id,
            projectId: timelineLocation.projectId,
            timelineId,
            title: event.title,
            description: event.description,
            time: event.time,
            year: event.year,
            month: event.month,
            day: event.day,
            type: event.type,
            associatedId: event.associatedId,
            characterIds: event.characterIds,
            locationIds: event.locationIds,
            organizationIds: event.organizationIds,
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
        };

        await fileSystemService.writeJson(
            this.getFilePath(
                timelineLocation.userId,
                timelineLocation.projectId,
                event.id,
            ),
            dto,
        );
    }

    async findById(id: string): Promise<Event | null> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return null;
        }

        const dto = await fileSystemService.readJson<FileSystemEvent>(
            location.path,
        );
        return dto ? this.mapToEntity(dto) : null;
    }

    async findByTimelineId(timelineId: string): Promise<Event[]> {
        const timelineLocation = await this.findTimelineLocation(timelineId);
        if (!timelineLocation) {
            return [];
        }

        const dirPath = this.getDirectoryPath(
            timelineLocation.userId,
            timelineLocation.projectId,
        );
        const files = await fileSystemService.listFiles(dirPath);
        const events: Event[] = [];

        for (const file of files) {
            if (!file.endsWith(".json")) {
                continue;
            }

            const dto = await fileSystemService.readJson<FileSystemEvent>(
                path.join(dirPath, file),
            );
            if (dto && dto.timelineId === timelineId) {
                events.push(this.mapToEntity(dto));
            }
        }

        return events;
    }

    async update(event: Event): Promise<void> {
        const location = await this.findFileLocation(event.id);
        if (!location) {
            return;
        }

        const dto: FileSystemEvent = {
            id: event.id,
            projectId: location.projectId,
            timelineId: event.timelineId,
            title: event.title,
            description: event.description,
            time: event.time,
            year: event.year,
            month: event.month,
            day: event.day,
            type: event.type,
            associatedId: event.associatedId,
            characterIds: event.characterIds,
            locationIds: event.locationIds,
            organizationIds: event.organizationIds,
            createdAt: event.createdAt.toISOString(),
            updatedAt: event.updatedAt.toISOString(),
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

    async deleteByTimelineId(timelineId: string): Promise<void> {
        const timelineLocation = await this.findTimelineLocation(timelineId);
        if (!timelineLocation) {
            return;
        }

        const dirPath = this.getDirectoryPath(
            timelineLocation.userId,
            timelineLocation.projectId,
        );
        const files = await fileSystemService.listFiles(dirPath);

        for (const file of files) {
            if (!file.endsWith(".json")) {
                continue;
            }

            const eventPath = path.join(dirPath, file);
            const dto =
                await fileSystemService.readJson<FileSystemEvent>(eventPath);
            if (dto?.timelineId === timelineId) {
                await fileSystemService.deleteFile(eventPath);
            }
        }
    }

    private async findTimelineLocation(
        timelineId: string,
    ): Promise<{ userId: string; projectId: string } | null> {
        const users = await fileSystemService.listFiles("users");

        for (const userId of users) {
            const projectsDir = path.join("users", userId, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);

            for (const projectFile of projects) {
                if (!projectFile.endsWith(".json")) {
                    continue;
                }

                const projectId = projectFile.replace(".json", "");
                const timelinePath = this.getTimelineFilePath(
                    userId,
                    projectId,
                    timelineId,
                );

                if (await fileSystemService.exists(timelinePath)) {
                    return { userId, projectId };
                }
            }
        }

        return null;
    }

    private async findFileLocation(
        eventId: string,
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
                const eventPath = this.getFilePath(userId, projectId, eventId);

                if (await fileSystemService.exists(eventPath)) {
                    return {
                        userId,
                        projectId,
                        path: eventPath,
                    };
                }
            }
        }

        return null;
    }

    private mapToEntity(dto: FileSystemEvent): Event {
        return new Event(
            dto.id,
            dto.timelineId,
            dto.title,
            dto.description,
            dto.time,
            dto.year ?? dto.time,
            dto.month,
            dto.day,
            dto.type,
            dto.associatedId,
            dto.characterIds,
            dto.locationIds,
            dto.organizationIds,
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
        );
    }
}
