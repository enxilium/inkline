import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface OverwriteOrganizationRequest {
    organizationId: string;
    name: string;
    description: string;
    mission: string;
    tags: string[];
    locationIds: string[];
    bgmId: string | null;
    playlistId: string | null;
    galleryImageIds: string[];
}

export class OverwriteOrganization {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly locationRepository: ILocationRepository
    ) {}

    async execute(request: OverwriteOrganizationRequest): Promise<void> {
        const { organizationId, ...payload } = request;

        const organization =
            await this.organizationRepository.findById(organizationId);
        if (!organization) {
            throw new Error("Organization not found.");
        }

        const previousLocationIds = [...organization.locationIds];

        organization.name = payload.name;
        organization.description = payload.description;
        organization.mission = payload.mission;
        organization.tags = payload.tags;
        organization.locationIds = payload.locationIds;
        organization.bgmId = payload.bgmId;
        organization.playlistId = payload.playlistId;
        organization.galleryImageIds = payload.galleryImageIds;

        organization.updatedAt = new Date();

        await this.organizationRepository.update(organization);

        await this.syncLocationCaches(
            organization.id,
            previousLocationIds,
            organization.locationIds
        );
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
