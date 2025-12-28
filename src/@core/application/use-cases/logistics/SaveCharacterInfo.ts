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
        powers?: { title: string; description: string }[];
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

        let hasChanges = false;

        if (payload.name !== undefined && character.name !== payload.name) {
            character.name = payload.name;
            hasChanges = true;
        }
        if (payload.race !== undefined && character.race !== payload.race) {
            character.race = payload.race;
            hasChanges = true;
        }
        if (payload.age !== undefined && character.age !== payload.age) {
            character.age = payload.age;
            hasChanges = true;
        }
        if (
            payload.description !== undefined &&
            character.description !== payload.description
        ) {
            character.description = payload.description;
            hasChanges = true;
        }
        if (
            payload.traits !== undefined &&
            JSON.stringify(character.traits) !== JSON.stringify(payload.traits)
        ) {
            character.traits = payload.traits;
            hasChanges = true;
        }
        if (
            payload.goals !== undefined &&
            JSON.stringify(character.goals) !== JSON.stringify(payload.goals)
        ) {
            character.goals = payload.goals;
            hasChanges = true;
        }
        if (
            payload.secrets !== undefined &&
            JSON.stringify(character.secrets) !==
                JSON.stringify(payload.secrets)
        ) {
            character.secrets = payload.secrets;
            hasChanges = true;
        }
        if (
            payload.powers !== undefined &&
            JSON.stringify(character.powers) !== JSON.stringify(payload.powers)
        ) {
            character.powers = payload.powers;
            hasChanges = true;
        }
        if (
            payload.tags !== undefined &&
            JSON.stringify(character.tags) !== JSON.stringify(payload.tags)
        ) {
            character.tags = payload.tags;
            hasChanges = true;
        }

        if (payload.currentLocationId !== undefined) {
            const newLocationId = await this.resolveLocationId(
                payload.currentLocationId
            );
            if (character.currentLocationId !== newLocationId) {
                character.currentLocationId = newLocationId;
                hasChanges = true;
            }
        }

        if (payload.backgroundLocationId !== undefined) {
            const newBackgroundId = await this.resolveLocationId(
                payload.backgroundLocationId
            );
            if (character.backgroundLocationId !== newBackgroundId) {
                character.backgroundLocationId = newBackgroundId;
                hasChanges = true;
            }
        }

        if (payload.organizationId !== undefined) {
            const newOrgId = await this.resolveOrganizationId(
                payload.organizationId
            );
            if (character.organizationId !== newOrgId) {
                character.organizationId = newOrgId;
                hasChanges = true;
            }
        }

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
