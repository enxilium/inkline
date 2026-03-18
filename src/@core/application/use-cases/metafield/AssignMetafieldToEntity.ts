import { generateId } from "../../utils/id";
import { MetafieldAssignment } from "../../../domain/entities/story/world/MetafieldAssignment";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";

export interface AssignMetafieldToEntityRequest {
    definitionId: string;
    entityType: "character" | "location" | "organization";
    entityId: string;
    initialValue?: unknown;
}

export interface AssignMetafieldToEntityResponse {
    assignment: MetafieldAssignment;
    created: boolean;
}

const isScopeAllowed = (
    scope: "character" | "location" | "organization" | "project",
    entityType: "character" | "location" | "organization",
): boolean => {
    if (scope === "project") {
        return true;
    }
    return scope === entityType;
};

const makeInitialAssignmentValue = (
    valueType:
        | "string"
        | "string[]"
        | "entity"
        | "entity[]"
        | "image"
        | "image[]",
    providedValue: unknown,
): unknown => {
    if (providedValue !== undefined && providedValue !== null) {
        return providedValue;
    }

    if (
        valueType === "string[]" ||
        valueType === "entity[]" ||
        valueType === "image[]"
    ) {
        return [];
    }

    return "";
};

export class AssignMetafieldToEntity {
    constructor(
        private readonly definitionRepository: IMetafieldDefinitionRepository,
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: AssignMetafieldToEntityRequest,
    ): Promise<AssignMetafieldToEntityResponse> {
        const definitionId = request.definitionId.trim();
        const entityId = request.entityId.trim();

        if (!definitionId) {
            throw new Error("Metafield definition ID is required.");
        }

        if (!entityId) {
            throw new Error("Entity ID is required.");
        }

        const definition =
            await this.definitionRepository.findById(definitionId);
        if (!definition) {
            throw new Error("Metafield definition not found.");
        }

        if (!isScopeAllowed(definition.scope, request.entityType)) {
            throw new Error("Metafield scope does not allow this entity type.");
        }

        const existing =
            await this.assignmentRepository.findByDefinitionAndEntity(
                definitionId,
                request.entityType,
                entityId,
            );

        if (existing) {
            return {
                assignment: existing,
                created: false,
            };
        }

        const entityAssignments = await this.assignmentRepository.findByEntity(
            request.entityType,
            entityId,
        );

        for (const entityAssignment of entityAssignments) {
            const assignedDefinition = await this.definitionRepository.findById(
                entityAssignment.definitionId,
            );
            if (!assignedDefinition) {
                continue;
            }

            if (
                assignedDefinition.nameNormalized === definition.nameNormalized
            ) {
                throw new Error(
                    "This entity already has a metafield with the same normalized name.",
                );
            }
        }

        const nextOrderIndex =
            entityAssignments.reduce(
                (max, assignment) => Math.max(max, assignment.orderIndex),
                -1,
            ) + 1;

        const now = new Date();
        const assignment = new MetafieldAssignment(
            generateId(),
            definition.projectId,
            definition.id,
            request.entityType,
            entityId,
            makeInitialAssignmentValue(
                definition.valueType,
                request.initialValue,
            ),
            nextOrderIndex,
            now,
            now,
        );

        await this.assignmentRepository.create(assignment);

        return {
            assignment,
            created: true,
        };
    }
}
