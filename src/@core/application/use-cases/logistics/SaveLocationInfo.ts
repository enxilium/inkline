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
        if (
            payload.culture !== undefined &&
            location.culture !== payload.culture
        ) {
            location.culture = payload.culture;
            hasChanges = true;
        }
        if (
            payload.history !== undefined &&
            location.history !== payload.history
        ) {
            location.history = payload.history;
            hasChanges = true;
        }
        if (
            payload.conflicts !== undefined &&
            JSON.stringify(location.conflicts) !==
                JSON.stringify(payload.conflicts)
        ) {
            location.conflicts = payload.conflicts;
            hasChanges = true;
        }
        if (
            payload.tags !== undefined &&
            JSON.stringify(location.tags) !== JSON.stringify(payload.tags)
        ) {
            location.tags = payload.tags;
            hasChanges = true;
        }

        if (hasChanges) {
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        }
    }
}
