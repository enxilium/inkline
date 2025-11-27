import { Location } from "../../../domain/entities/story/world/Location";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateLocationRequest {
    projectId: string;
}

export interface CreateLocationResponse {
    location: Location;
}

export class CreateLocation {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(
        request: CreateLocationRequest
    ): Promise<CreateLocationResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error("Project ID is required for location creation.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = generateId();
        const location = new Location(
            id,
            "",
            "",
            "",
            "",
            [],
            [],
            now,
            now,
            null,
            null,
            [],
            [],
            []
        );

        await this.locationRepository.create(projectId, location);

        if (!project.locationIds.includes(id)) {
            project.locationIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { location };
    }
}
