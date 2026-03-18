import { generateId } from "../../utils/id";
import { normalizeMetafieldName } from "../../utils/normalizeMetafieldName";
import {
    MetafieldDefinition,
    MetafieldScope,
    MetafieldTargetEntityKind,
    MetafieldValueType,
} from "../../../domain/entities/story/world/MetafieldDefinition";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";

export interface CreateOrReuseMetafieldDefinitionRequest {
    projectId: string;
    name: string;
    scope: MetafieldScope;
    valueType: MetafieldValueType;
    targetEntityKind?: MetafieldTargetEntityKind;
}

export interface CreateOrReuseMetafieldDefinitionResponse {
    definition: MetafieldDefinition;
    created: boolean;
}

export class CreateOrReuseMetafieldDefinition {
    constructor(
        private readonly definitionRepository: IMetafieldDefinitionRepository,
    ) {}

    async execute(
        request: CreateOrReuseMetafieldDefinitionRequest,
    ): Promise<CreateOrReuseMetafieldDefinitionResponse> {
        const projectId = request.projectId.trim();
        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        const name = request.name.trim();
        if (!name) {
            throw new Error("Metafield name is required.");
        }

        const normalized = normalizeMetafieldName(name);

        if (
            request.valueType === "entity" ||
            request.valueType === "entity[]"
        ) {
            if (!request.targetEntityKind) {
                throw new Error(
                    "Entity metafields must include a target entity kind.",
                );
            }
        }

        if (
            request.valueType !== "entity" &&
            request.valueType !== "entity[]" &&
            request.targetEntityKind
        ) {
            throw new Error(
                "Only entity metafields can include a target entity kind.",
            );
        }

        const now = new Date();
        const definition = new MetafieldDefinition(
            generateId(),
            projectId,
            name,
            normalized,
            request.scope,
            request.valueType,
            request.targetEntityKind ?? null,
            now,
            now,
        );

        await this.definitionRepository.create(definition);

        return {
            definition,
            created: true,
        };
    }
}
