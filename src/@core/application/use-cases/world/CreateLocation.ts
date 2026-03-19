import { Location } from "../../../domain/entities/story/world/Location";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateLocationRequest {
    projectId: string;
    /** Optional client-generated ID used for optimistic UI flows. */
    id?: string;
    /** Optional parent location. If omitted, location is created at root level. */
    parentLocationId?: string | null;
}

export interface CreateLocationResponse {
    location: Location;
}

export class CreateLocation {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly projectRepository: IProjectRepository,
    ) {}

    async execute(
        request: CreateLocationRequest,
    ): Promise<CreateLocationResponse> {
        const projectId = request.projectId.trim();
        const parentLocationId = request.parentLocationId?.trim() || null;

        if (!projectId) {
            throw new Error("Project ID is required for location creation.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = request.id?.trim() || generateId();
        const location = new Location(
            id,
            "",
            "",
            now,
            now,
            null,
            null,
            [],
            [],
            [],
        );

        await this.locationRepository.create(projectId, location);

        if (parentLocationId) {
            const parentLocation =
                await this.locationRepository.findById(parentLocationId);
            const projectLocationIds = new Set(
                (await this.locationRepository.findByProjectId(projectId)).map(
                    (entry) => entry.id,
                ),
            );

            if (!parentLocation || !projectLocationIds.has(parentLocationId)) {
                throw new Error("Parent location not found.");
            }

            if (!parentLocation.sublocationIds.includes(id)) {
                parentLocation.sublocationIds.push(id);
                parentLocation.updatedAt = now;
                await this.locationRepository.update(parentLocation);
            }
        } else if (!project.locationIds.includes(id)) {
            project.locationIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { location };
    }
}
