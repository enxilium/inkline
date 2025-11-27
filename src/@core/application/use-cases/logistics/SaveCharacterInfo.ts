import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface SaveCharacterInfoRequest {
    projectId: string;
    characterId: string;
    payload: {
        name?: string;
        race?: string;
        age?: number | null;
        description?: string;
        traits?: string[];
        goals?: string[];
        secrets?: string[];
        quote?: string;
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
        const { projectId, characterId, payload } = request;

        if (!projectId.trim() || !characterId.trim()) {
            throw new Error("Project ID and Character ID are required.");
        }

        const character = await this.characterRepository.findById(
            projectId,
            characterId
        );
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
        if (payload.quote !== undefined) character.quote = payload.quote;
        if (payload.tags !== undefined) character.tags = payload.tags;

        if (payload.currentLocationId !== undefined) {
            character.currentLocationId = await this.resolveLocationId(
                projectId,
                payload.currentLocationId
            );
        }

        if (payload.backgroundLocationId !== undefined) {
            character.backgroundLocationId = await this.resolveLocationId(
                projectId,
                payload.backgroundLocationId
            );
        }

        if (payload.organizationId !== undefined) {
            character.organizationId = await this.resolveOrganizationId(
                projectId,
                payload.organizationId
            );
        }

        character.updatedAt = new Date();
        await this.characterRepository.update(projectId, character);

        await this.syncLocationCaches(
            projectId,
            character.id,
            previousCurrentLocationId,
            previousBackgroundLocationId,
            character.currentLocationId,
            character.backgroundLocationId
        );
    }

    private async resolveLocationId(
        projectId: string,
        locationId: string | null
    ): Promise<string | null> {
        if (locationId === null) {
            return null;
        }

        const trimmed = locationId.trim();
        if (!trimmed) {
            return null;
        }

        const location = await this.locationRepository.findById(
            projectId,
            trimmed
        );
        if (!location) {
            throw new Error("Location not found for this project.");
        }
        return trimmed;
    }

    private async resolveOrganizationId(
        projectId: string,
        organizationId: string | null
    ): Promise<string | null> {
        if (organizationId === null) {
            return null;
        }

        const trimmed = organizationId.trim();
        if (!trimmed) {
            return null;
        }

        const organization = await this.organizationRepository.findById(
            projectId,
            trimmed
        );
        if (!organization) {
            throw new Error("Organization not found for this project.");
        }
        return trimmed;
    }

    private async syncLocationCaches(
        projectId: string,
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
                this.addCharacterToLocation(projectId, characterId, locationId)
            ),
            ...locationsToRemove.map((locationId) =>
                this.removeCharacterFromLocation(
                    projectId,
                    characterId,
                    locationId
                )
            ),
        ]);
    }

    private async addCharacterToLocation(
        projectId: string,
        characterId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(
            projectId,
            locationId
        );
        if (!location) {
            return;
        }

        if (!location.characterIds.includes(characterId)) {
            location.characterIds.push(characterId);
            location.updatedAt = new Date();
            await this.locationRepository.update(projectId, location);
        }
    }

    private async removeCharacterFromLocation(
        projectId: string,
        characterId: string,
        locationId: string
    ): Promise<void> {
        const location = await this.locationRepository.findById(
            projectId,
            locationId
        );
        if (!location) {
            return;
        }

        if (location.characterIds.includes(characterId)) {
            location.characterIds = location.characterIds.filter(
                (id) => id !== characterId
            );
            location.updatedAt = new Date();
            await this.locationRepository.update(projectId, location);
        }
    }
}
