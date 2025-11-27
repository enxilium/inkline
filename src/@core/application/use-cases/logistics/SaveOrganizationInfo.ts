import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface SaveOrganizationInfoRequest {
    projectId: string;
    organizationId: string;
    payload: {
        name?: string;
        description?: string;
        mission?: string;
        tags?: string[];
        locationIds?: string[];
    };
}

export class SaveOrganizationInfo {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly locationRepository: ILocationRepository
    ) {}

    async execute(request: SaveOrganizationInfoRequest): Promise<void> {
        const { projectId, organizationId, payload } = request;

        if (!projectId.trim() || !organizationId.trim()) {
            throw new Error("Project ID and Organization ID are required.");
        }

        const organization = await this.organizationRepository.findById(
            projectId,
            organizationId
        );
        if (!organization) {
            throw new Error("Organization not found for this project.");
        }

        if (payload.name !== undefined) organization.name = payload.name;
        if (payload.description !== undefined)
            organization.description = payload.description;
        if (payload.mission !== undefined)
            organization.mission = payload.mission;
        if (payload.tags !== undefined) organization.tags = payload.tags;

        const previousLocationIds = [...organization.locationIds];
        let nextLocationIds: string[] | null = null;
        if (payload.locationIds !== undefined) {
            nextLocationIds = await this.validateLocationIds(
                projectId,
                payload.locationIds
            );
            organization.locationIds = nextLocationIds;
        }

        organization.updatedAt = new Date();
        await this.organizationRepository.update(projectId, organization);

        if (nextLocationIds !== null) {
            await this.syncLocationCaches(
                projectId,
                organization.id,
                previousLocationIds,
                nextLocationIds
            );
        }
    }

    private async validateLocationIds(
        projectId: string,
        locationIds: string[]
    ): Promise<string[]> {
        const uniqueIds = Array.from(
            new Set(locationIds.map((id) => id.trim()))
        );
        const filtered = uniqueIds.filter((id) => !!id);

        await Promise.all(
            filtered.map(async (locationId) => {
                const location = await this.locationRepository.findById(
                    projectId,
                    locationId
                );
                if (!location) {
                    throw new Error(
                        `Location ${locationId} not found for this project.`
                    );
                }
            })
        );

        return filtered;
    }

    private async syncLocationCaches(
        projectId: string,
        organizationId: string,
        previousLocationIds: string[],
        nextLocationIds: string[]
    ): Promise<void> {
        const previous = new Set(previousLocationIds);
        const next = new Set(nextLocationIds);

        const toAdd = [...next].filter((id) => !previous.has(id));
        const toRemove = [...previous].filter((id) => !next.has(id));

        await Promise.all([
            ...toAdd.map((locationId) =>
                this.addOrganizationToLocation(
                    projectId,
                    organizationId,
                    locationId
                )
            ),
            ...toRemove.map((locationId) =>
                this.removeOrganizationFromLocation(
                    projectId,
                    organizationId,
                    locationId
                )
            ),
        ]);
    }

    private async addOrganizationToLocation(
        projectId: string,
        organizationId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(
            projectId,
            locationId
        );
        if (!location) {
            return;
        }

        if (!location.organizationIds.includes(organizationId)) {
            location.organizationIds.push(organizationId);
            location.updatedAt = new Date();
            await this.locationRepository.update(projectId, location);
        }
    }

    private async removeOrganizationFromLocation(
        projectId: string,
        organizationId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(
            projectId,
            locationId
        );
        if (!location) {
            return;
        }

        if (location.organizationIds.includes(organizationId)) {
            location.organizationIds = location.organizationIds.filter(
                (id) => id !== organizationId
            );
            location.updatedAt = new Date();
            await this.locationRepository.update(projectId, location);
        }
    }
}
