import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Project } from "../../../domain/entities/story/Project";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";
import { Timeline } from "../../../domain/entities/story/timeline/Timeline";
import { generateId } from "../../utils/id";

export interface CreateProjectRequest {
    userId: string;
    title: string;
}

export interface CreateProjectResponse {
    project: Project;
}

export class CreateProject {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly timelineRepository: ITimelineRepository
    ) {}

    async execute(
        request: CreateProjectRequest
    ): Promise<CreateProjectResponse> {
        const title = request.title.trim();
        const user = await this.userRepository.findById(request.userId);

        if (!title) {
            throw new Error("Project title is required.");
        }

        if (!user) {
            throw new Error("User not found.");
        }

        const now = new Date();
        const projectId = generateId();
        const mainTimelineId = generateId();

        // Create the Main timeline that every project must have
        const mainTimeline = new Timeline(
            mainTimelineId,
            projectId,
            "Main",
            "The primary timeline for this project",
            "CE", // Default to Common Era
            0, // Default center value
            [],
            now,
            now
        );

        const project = new Project(
            projectId,
            title,
            null,
            [],
            [],
            [],
            [],
            [],
            [mainTimelineId], // Include the Main timeline
            now,
            now
        );
        await this.projectRepository.create(request.userId, project);
        await this.timelineRepository.create(projectId, mainTimeline);

        if (!user.projectIds.includes(project.id)) {
            user.projectIds.push(project.id);
            user.updatedAt = now;
            await this.userRepository.update(user);
        }

        return { project };
    }
}
