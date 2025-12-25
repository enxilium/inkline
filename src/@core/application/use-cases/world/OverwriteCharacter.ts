import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface OverwriteCharacterRequest {
    characterId: string;
    name: string;
    race: string;
    age: number | null;
    description: string;
    traits: string[];
    goals: string[];
    secrets: string[];
    currentLocationId: string | null;
    backgroundLocationId: string | null;
    organizationId: string | null;
    tags: string[];
    bgmId: string | null;
    playlistId: string | null;
    galleryImageIds: string[];
}

export class OverwriteCharacter {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository
    ) {}

    async execute(request: OverwriteCharacterRequest): Promise<void> {
        const { characterId, ...payload } = request;

        const character = await this.characterRepository.findById(characterId);
        if (!character) {
            throw new Error("Character not found.");
        }

        const previousCurrentLocationId = character.currentLocationId;
        const previousBackgroundLocationId = character.backgroundLocationId;

        // Update all fields
        character.name = payload.name;
        character.race = payload.race;
        character.age = payload.age;
        character.description = payload.description;
        character.traits = payload.traits;
        character.goals = payload.goals;
        character.secrets = payload.secrets;
        character.currentLocationId = payload.currentLocationId;
        character.backgroundLocationId = payload.backgroundLocationId;
        character.organizationId = payload.organizationId;
        character.tags = payload.tags;
        character.bgmId = payload.bgmId;
        character.playlistId = payload.playlistId;
        character.galleryImageIds = payload.galleryImageIds;

        character.updatedAt = new Date();

        await this.characterRepository.update(character);

        // Sync Location Caches (Both Current and Background)
        await this.syncLocationCaches(
            character.id,
            previousCurrentLocationId,
            previousBackgroundLocationId,
            character.currentLocationId,
            character.backgroundLocationId
        );
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
