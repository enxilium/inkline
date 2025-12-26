import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface SaveCharacterInfoRequest {
    characterId: string;
    payload: {
        name?: string;
        race?: string;
        age?: number | null;
        description?: string;
        traits?: string[];
        goals?: string[];
        secrets?: string[];
        currentLocationId?: string | null;
        backgroundLocationId?: string | null;
        organizationId?: string | null;
        tags?: string[];
    };
}

export class SaveCharacterInfo {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository
    ) {}

    async execute(request: SaveCharacterInfoRequest): Promise<void> {
        const { characterId, payload } = request;

        if (!characterId.trim()) {
            throw new Error("Character ID is required.");
        }

        const character = await this.characterRepository.findById(characterId);
        if (!character) {
            throw new Error("Character not found for this project.");
        }

        const previousCurrentLocationId = character.currentLocationId;
        const previousBackgroundLocationId = character.backgroundLocationId;

        if (payload.name !== undefined) character.name = payload.name;
        if (payload.race !== undefined) character.race = payload.race;
        if (payload.age !== undefined) character.age = payload.age;
        if (payload.description !== undefined)
            character.description = payload.description;
        if (payload.traits !== undefined) character.traits = payload.traits;
        if (payload.goals !== undefined) character.goals = payload.goals;
        if (payload.secrets !== undefined) character.secrets = payload.secrets;
        if (payload.tags !== undefined) character.tags = payload.tags;

        if (payload.currentLocationId !== undefined) {
            character.currentLocationId = await this.resolveLocationId(
                payload.currentLocationId
            );
        }

        if (payload.backgroundLocationId !== undefined) {
            character.backgroundLocationId = await this.resolveLocationId(
                payload.backgroundLocationId
            );
        }

        if (payload.organizationId !== undefined) {
            character.organizationId = await this.resolveOrganizationId(
                payload.organizationId
            );
        }

        // Check if anything actually changed
        const hasChanges =
            (payload.name !== undefined && character.name !== payload.name) ||
            (payload.race !== undefined && character.race !== payload.race) ||
            (payload.age !== undefined && character.age !== payload.age) ||
            (payload.description !== undefined &&
                character.description !== payload.description) ||
            (payload.traits !== undefined &&
                JSON.stringify(character.traits) !==
                    JSON.stringify(payload.traits)) ||
            (payload.goals !== undefined &&
                JSON.stringify(character.goals) !==
                    JSON.stringify(payload.goals)) ||
            (payload.secrets !== undefined &&
                JSON.stringify(character.secrets) !==
                    JSON.stringify(payload.secrets)) ||
            (payload.tags !== undefined &&
                JSON.stringify(character.tags) !==
                    JSON.stringify(payload.tags)) ||
            (payload.currentLocationId !== undefined &&
                character.currentLocationId !== payload.currentLocationId) ||
            (payload.backgroundLocationId !== undefined &&
                character.backgroundLocationId !==
                    payload.backgroundLocationId) ||
            (payload.organizationId !== undefined &&
                character.organizationId !== payload.organizationId);

        if (hasChanges) {
            character.updatedAt = new Date();
            await this.characterRepository.update(character);
        }

        await this.syncLocationCaches(
            character.id,
            previousCurrentLocationId,
            previousBackgroundLocationId,
            character.currentLocationId,
            character.backgroundLocationId
        );
    }

    private async resolveLocationId(
        locationId: string | null
    ): Promise<string | null> {
        if (locationId === null) {
            return null;
        }

        const trimmed = locationId.trim();
        if (!trimmed) {
            return null;
        }

        const location = await this.locationRepository.findById(trimmed);
        if (!location) {
            throw new Error("Location not found for this project.");
        }
        return trimmed;
    }

    private async resolveOrganizationId(
        organizationId: string | null
    ): Promise<string | null> {
        if (organizationId === null) {
            return null;
        }

        const trimmed = organizationId.trim();
        if (!trimmed) {
            return null;
        }

        const organization =
            await this.organizationRepository.findById(trimmed);
        if (!organization) {
            throw new Error("Organization not found for this project.");
        }
        return trimmed;
    }

    private async syncLocationCaches(
        characterId: string,
        prevCurrent: string | null,
        prevBackground: string | null,
        nextCurrent: string | null,
        nextBackground: string | null
    ): Promise<void> {
        const previousLocations = new Set(
            [prevCurrent, prevBackground].filter(
                (value): value is string => !!value
            )
        );
        const nextLocations = new Set(
            [nextCurrent, nextBackground].filter(
                (value): value is string => !!value
            )
        );

        const locationsToAdd = [...nextLocations].filter(
            (id) => !previousLocations.has(id)
        );
        const locationsToRemove = [...previousLocations].filter(
            (id) => !nextLocations.has(id)
        );

        await Promise.all([
            ...locationsToAdd.map((locationId) =>
                this.addCharacterToLocation(characterId, locationId)
            ),
            ...locationsToRemove.map((locationId) =>
                this.removeCharacterFromLocation(characterId, locationId)
            ),
        ]);
    }

    private async addCharacterToLocation(
        characterId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            return;
        }

        if (!location.characterIds.includes(characterId)) {
            location.characterIds.push(characterId);
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        }
    }

    private async removeCharacterFromLocation(
        characterId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(locationId);
        if (!location) {
            return;
        }

        if (location.characterIds.includes(characterId)) {
            location.characterIds = location.characterIds.filter(
                (id) => id !== characterId
            );
            location.updatedAt = new Date();
            await this.locationRepository.update(location);
        }
    }
}
