import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";

export interface SaveLocationInfoRequest {
    projectId: string;
    locationId: string;
    payload: {
        name?: string;
        description?: string;
        parentLocationId?: string | null;
    };
}

export class SaveLocationInfo {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly projectRepository: IProjectRepository,
    ) {}

    async execute(request: SaveLocationInfoRequest): Promise<void> {
        const { projectId, locationId, payload } = request;

        if (!projectId.trim()) {
            throw new Error("Project ID is required.");
        }

        if (!locationId.trim()) {
            throw new Error("Location ID is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const locations =
            await this.locationRepository.findByProjectId(projectId);
        const locationMap = new Map(
            locations.map((entry) => [entry.id, entry]),
        );

        const location = locationMap.get(locationId);
        if (!location) {
            throw new Error("Location not found for this project.");
        }

        let hasChanges = false;

        if (payload.name !== undefined && location.name !== payload.name) {
            location.name = payload.name;
            hasChanges = true;
        }
        if (
            payload.description !== undefined &&
            location.description !== payload.description
        ) {
            location.description = payload.description;
            hasChanges = true;
        }

        if (payload.parentLocationId !== undefined) {
            const nextParentId = payload.parentLocationId?.trim() || null;

            if (nextParentId === locationId) {
                throw new Error("A location cannot contain itself.");
            }

            if (nextParentId && !locationMap.has(nextParentId)) {
                throw new Error("Parent location not found for this project.");
            }

            const currentParentId = this.findParentLocationId(
                locationId,
                locations,
            );

            if (
                nextParentId &&
                this.isDescendantLocation(nextParentId, locationId, locationMap)
            ) {
                throw new Error(
                    "Cannot move a location under its own descendant.",
                );
            }

            if (currentParentId !== nextParentId) {
                const now = new Date();

                if (currentParentId) {
                    const currentParent = locationMap.get(currentParentId);
                    if (currentParent) {
                        currentParent.sublocationIds =
                            currentParent.sublocationIds.filter(
                                (childId) => childId !== locationId,
                            );
                        currentParent.updatedAt = now;
                        await this.locationRepository.update(currentParent);
                    }
                } else {
                    project.locationIds = project.locationIds.filter(
                        (id) => id !== locationId,
                    );
                }

                if (nextParentId) {
                    const nextParent = locationMap.get(nextParentId);
                    if (
                        nextParent &&
                        !nextParent.sublocationIds.includes(locationId)
                    ) {
                        nextParent.sublocationIds.push(locationId);
                        nextParent.updatedAt = now;
                        await this.locationRepository.update(nextParent);
                    }
                } else if (!project.locationIds.includes(locationId)) {
                    project.locationIds.push(locationId);
                }

                project.updatedAt = now;
                await this.projectRepository.update(project);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        }
    }

    private findParentLocationId(
        locationId: string,
        locations: Array<{ id: string; sublocationIds: string[] }>,
    ): string | null {
        for (const location of locations) {
            if (location.sublocationIds.includes(locationId)) {
                return location.id;
            }
        }

        return null;
    }

    private isDescendantLocation(
        candidateParentId: string,
        targetLocationId: string,
        locationsById: Map<string, { sublocationIds: string[] }>,
    ): boolean {
        const stack = [targetLocationId];
        const visited = new Set<string>();

        while (stack.length > 0) {
            const currentId = stack.pop();
            if (!currentId || visited.has(currentId)) {
                continue;
            }

            visited.add(currentId);
            const current = locationsById.get(currentId);
            if (!current) {
                continue;
            }

            for (const childId of current.sublocationIds) {
                if (childId === candidateParentId) {
                    return true;
                }
                stack.push(childId);
            }
        }

        return false;
    }
}
