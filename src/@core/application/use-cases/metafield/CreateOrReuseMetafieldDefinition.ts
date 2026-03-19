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

        const existing =
            await this.definitionRepository.findByProjectAndNameNormalized(
                projectId,
                normalized,
            );

        if (existing) {
            const needsNormalization =
                existing.nameNormalized !== normalized ||
                existing.name !== name;

            if (existing.valueType !== request.valueType) {
                throw new Error(
                    "A metafield with this name already exists with a different value type.",
                );
            }

            const existingTarget = existing.targetEntityKind ?? null;
            const requestedTarget = request.targetEntityKind ?? null;
            if (existingTarget !== requestedTarget) {
                throw new Error(
                    "A metafield with this name already exists with a different target entity kind.",
                );
            }

            const canPromoteToProjectScope =
                existing.scope !== request.scope &&
                existing.scope !== "project" &&
                request.scope !== "project";

            if (needsNormalization) {
                existing.name = name;
                existing.nameNormalized = normalized;
                existing.updatedAt = now;
                await this.definitionRepository.update(existing);
            }

            if (canPromoteToProjectScope) {
                existing.scope = "project";
                existing.updatedAt = now;
                await this.definitionRepository.update(existing);
            }

            return {
                definition: existing,
                created: false,
            };
        }

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
