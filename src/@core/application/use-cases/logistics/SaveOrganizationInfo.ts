import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface SaveOrganizationInfoRequest {
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
        const { organizationId, payload } = request;

        if (!organizationId.trim()) {
            throw new Error("Organization ID is required.");
        }

        const organization =
            await this.organizationRepository.findById(organizationId);
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
                payload.locationIds
            );
            organization.locationIds = nextLocationIds;
        }

        // Check if anything actually changed
        const hasChanges =
            (payload.name !== undefined &&
                organization.name !== payload.name) ||
            (payload.description !== undefined &&
                organization.description !== payload.description) ||
            (payload.mission !== undefined &&
                organization.mission !== payload.mission) ||
            (payload.tags !== undefined &&
                JSON.stringify(organization.tags) !==
                    JSON.stringify(payload.tags)) ||
            (nextLocationIds !== null &&
                JSON.stringify(previousLocationIds) !==
                    JSON.stringify(nextLocationIds));

        if (hasChanges) {
            organization.updatedAt = new Date();
            await this.organizationRepository.update(organization);
        }

        if (nextLocationIds !== null) {
            await this.syncLocationCaches(
                organization.id,
                previousLocationIds,
                nextLocationIds
            );
        }
    }

    private async validateLocationIds(
        locationIds: string[]
    ): Promise<string[]> {
        const uniqueIds = Array.from(
            new Set(locationIds.map((id) => id.trim()))
        );
        const filtered = uniqueIds.filter((id) => !!id);

        await Promise.all(
            filtered.map(async (locationId) => {
                const location =
                    await this.locationRepository.findById(locationId);
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
                this.addOrganizationToLocation(organizationId, locationId)
            ),
            ...toRemove.map((locationId) =>
                this.removeOrganizationFromLocation(organizationId, locationId)
            ),
        ]);
    }

    private async addOrganizationToLocation(
        organizationId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            return;
        }

        if (!location.organizationIds.includes(organizationId)) {
            location.organizationIds.push(organizationId);
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        }
    }

    private async removeOrganizationFromLocation(
        organizationId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            return;
        }

        if (location.organizationIds.includes(organizationId)) {
            location.organizationIds = location.organizationIds.filter(
                (id) => id !== organizationId
            );
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        }
    }
}
