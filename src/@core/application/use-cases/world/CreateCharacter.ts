import { Character } from "../../../domain/entities/story/world/Character";
import {
    MetafieldDefinition,
    MetafieldValueType,
} from "../../../domain/entities/story/world/MetafieldDefinition";
import { MetafieldAssignment } from "../../../domain/entities/story/world/MetafieldAssignment";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";
import { normalizeMetafieldName } from "../../utils/normalizeMetafieldName";

type CharacterMetafieldSeed = {
    name: string;
    valueType: MetafieldValueType;
    initialValue: unknown;
};

const CHARACTER_DEFAULT_METAFIELDS: CharacterMetafieldSeed[] = [
    { name: "Race", valueType: "string", initialValue: "" },
    { name: "Age", valueType: "string", initialValue: "" },
    { name: "Personality", valueType: "string[]", initialValue: [] },
    {
        name: "Powers & Abilities",
        valueType: "string[]",
        initialValue: [],
    },
];

export interface CreateCharacterRequest {
    projectId: string;
    /** Optional client-generated ID used for optimistic UI flows. */
    id?: string;
}

export interface CreateCharacterResponse {
    character: Character;
}

export class CreateCharacter {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly metafieldDefinitionRepository: IMetafieldDefinitionRepository,
        private readonly metafieldAssignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: CreateCharacterRequest,
    ): Promise<CreateCharacterResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error("Project ID is required for character creation.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = request.id?.trim() || generateId();
        const character = new Character(
            id,
            "",
            "",
            null,
            null,
            null,
            null,
            null,
            [],
            now,
            now,
        );

        await this.characterRepository.create(projectId, character);

        await this.seedCharacterMetafields(projectId, id, now);

        if (!project.characterIds.includes(id)) {
            project.characterIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { character };
    }

    private async seedCharacterMetafields(
        projectId: string,
        characterId: string,
        now: Date,
    ): Promise<void> {
        for (const [index, seed] of CHARACTER_DEFAULT_METAFIELDS.entries()) {
            const definition = await this.createDefinition(
                projectId,
                seed,
                now,
            );

            const assignment = new MetafieldAssignment(
                generateId(),
                projectId,
                definition.id,
                "character",
                characterId,
                this.cloneInitialValue(seed.initialValue),
                index,
                now,
                now,
            );

            await this.metafieldAssignmentRepository.create(assignment);
        }
    }

    private async createDefinition(
        projectId: string,
        seed: CharacterMetafieldSeed,
        now: Date,
    ): Promise<MetafieldDefinition> {
        const normalized = normalizeMetafieldName(seed.name);
        const existing =
            await this.metafieldDefinitionRepository.findByProjectAndNameNormalized(
                projectId,
                normalized,
            );
        if (existing) {
            return existing;
        }

        const definition = new MetafieldDefinition(
            generateId(),
            projectId,
            seed.name,
            normalized,
            "character",
            seed.valueType,
            null,
            now,
            now,
        );

        await this.metafieldDefinitionRepository.create(definition);
        return definition;
    }

    private cloneInitialValue(value: unknown): unknown {
        if (Array.isArray(value)) {
            return [...value];
        }

        if (value && typeof value === "object") {
            return { ...(value as Record<string, unknown>) };
        }

        return value;
    }
}
