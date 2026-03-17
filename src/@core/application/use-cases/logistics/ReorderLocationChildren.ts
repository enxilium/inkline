import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface ReorderLocationChildrenRequest {
    projectId: string;
    parentLocationId: string | null;
    orderedLocationIds: string[];
}

export class ReorderLocationChildren {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly projectRepository: IProjectRepository,
    ) {}

    async execute(request: ReorderLocationChildrenRequest): Promise<void> {
        const projectId = request.projectId.trim();
        const parentLocationId = request.parentLocationId?.trim() || null;

        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const locations =
            await this.locationRepository.findByProjectId(projectId);
        const locationIds = new Set(locations.map((location) => location.id));

        const validateIdsBelongToProject = request.orderedLocationIds.every(
            (locationId) => locationIds.has(locationId),
        );
        if (!validateIdsBelongToProject) {
            throw new Error(
                "One or more locations do not belong to this project.",
            );
        }

        if (parentLocationId) {
            const parent = locations.find(
                (location) => location.id === parentLocationId,
            );
            if (!parent) {
                throw new Error("Parent location not found for this project.");
            }

            this.validateExactIdSet(
                parent.sublocationIds,
                request.orderedLocationIds,
                "Ordered child locations must match the current parent children.",
            );

            parent.sublocationIds = [...request.orderedLocationIds];
            parent.updatedAt = new Date();
            await this.locationRepository.update(parent);
            return;
        }

        this.validateExactIdSet(
            project.locationIds,
            request.orderedLocationIds,
            "Ordered root locations must match the current root location list.",
        );

        project.locationIds = [...request.orderedLocationIds];
        project.updatedAt = new Date();
        await this.projectRepository.update(project);
    }

    private validateExactIdSet(
        currentIds: string[],
        requestedIds: string[],
        errorMessage: string,
    ): void {
        if (currentIds.length !== requestedIds.length) {
            throw new Error(errorMessage);
        }

        const current = new Set(currentIds);
        const requested = new Set(requestedIds);

        if (current.size !== requested.size) {
            throw new Error(errorMessage);
        }

        for (const id of requested) {
            if (!current.has(id)) {
                throw new Error(errorMessage);
            }
        }
    }
}
