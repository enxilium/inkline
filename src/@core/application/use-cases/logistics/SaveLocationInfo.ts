import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";

export interface SaveLocationInfoRequest {
    locationId: string;
    payload: {
        name?: string;
        description?: string;
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
        if (hasChanges) {
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        }
    }
}
