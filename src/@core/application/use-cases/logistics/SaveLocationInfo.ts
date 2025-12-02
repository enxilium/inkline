import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";

export interface SaveLocationInfoRequest {
    locationId: string;
    payload: {
        name?: string;
        description?: string;
        culture?: string;
        history?: string;
        conflicts?: string[];
        tags?: string[];
    };
}

export class SaveLocationInfo {
    constructor(private readonly locationRepository: ILocationRepository) {}

    async execute(request: SaveLocationInfoRequest): Promise<void> {
        const { locationId, payload } = request;

        if (!locationId.trim()) {
            throw new Error("Location ID is required.");
        }

        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            throw new Error("Location not found for this project.");
        }

        if (payload.name !== undefined) location.name = payload.name;
        if (payload.description !== undefined)
            location.description = payload.description;
        if (payload.culture !== undefined) location.culture = payload.culture;
        if (payload.history !== undefined) location.history = payload.history;
        if (payload.conflicts !== undefined)
            location.conflicts = payload.conflicts;
        if (payload.tags !== undefined) location.tags = payload.tags;

        location.updatedAt = new Date();
        await this.locationRepository.update(location);
    }
}
