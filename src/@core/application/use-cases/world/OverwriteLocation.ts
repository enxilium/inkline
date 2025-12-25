import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface OverwriteLocationRequest {
    projectId: string;
    locationId: string;
    name: string;
    description: string;
    culture: string;
    history: string;
    conflicts: string[];
    tags: string[];
    characterIds: string[]; // Ignored in favor of recalculation
    organizationIds: string[]; // Ignored in favor of recalculation
    bgmId: string | null;
    playlistId: string | null;
    galleryImageIds: string[];
}

export class OverwriteLocation {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly organizationRepository: IOrganizationRepository
    ) {}

    async execute(request: OverwriteLocationRequest): Promise<void> {
        const { projectId, locationId, ...payload } = request;

        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            throw new Error("Location not found.");
        }

        // Update fields (excluding caches)
        location.name = payload.name;
        location.description = payload.description;
        location.culture = payload.culture;
        location.history = payload.history;
        location.conflicts = payload.conflicts;
        location.tags = payload.tags;
        location.bgmId = payload.bgmId;
        location.playlistId = payload.playlistId;
        location.galleryImageIds = payload.galleryImageIds;

        // Recalculate Caches from Source of Truth (Local Characters/Orgs)
        // This ensures that if we overwrite the location, we don't introduce
        // inconsistencies with the local state of characters/orgs.

        const projectCharacters =
            await this.characterRepository.findByProjectId(projectId);
        const charactersAtLocation = projectCharacters.filter(
            (c) =>
                c.currentLocationId === locationId ||
                c.backgroundLocationId === locationId
        );
        location.characterIds = charactersAtLocation.map((c) => c.id);

        // For Organizations, we can use findByLocationId if available, or scan all.
        // IOrganizationRepository has findByLocationId.
        const organizationsAtLocation =
            await this.organizationRepository.findByLocationId(locationId);
        location.organizationIds = organizationsAtLocation.map((o) => o.id);

        location.updatedAt = new Date();

        await this.locationRepository.update(location);
    }
}
