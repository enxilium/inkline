import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";

export interface SaveMetafieldValueRequest {
    assignmentId: string;
    value?: unknown;
    orderIndex?: number;
}

export class SaveMetafieldValue {
    constructor(
        private readonly definitionRepository: IMetafieldDefinitionRepository,
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(request: SaveMetafieldValueRequest): Promise<void> {
        const assignmentId = request.assignmentId.trim();
        if (!assignmentId) {
            throw new Error("Assignment ID is required.");
        }

        const assignment =
            await this.assignmentRepository.findById(assignmentId);
        if (!assignment) {
            throw new Error("Metafield assignment not found.");
        }

        const definition = await this.definitionRepository.findById(
            assignment.definitionId,
        );
        if (!definition) {
            throw new Error("Metafield definition not found.");
        }

        let changed = false;

        if (request.value !== undefined) {
            if (definition.valueType === "string[]") {
                this.assertValidSelectValue(request.value, definition.id, definition.selectOptions.map((option) => option.id));
            }

            const currentSerialized = JSON.stringify(assignment.valueJson);
            const nextSerialized = JSON.stringify(request.value);
            if (currentSerialized !== nextSerialized) {
                assignment.valueJson = request.value;
                changed = true;
            }
        }
        if (
            request.orderIndex !== undefined &&
            assignment.orderIndex !== request.orderIndex
        ) {
            assignment.orderIndex = request.orderIndex;
            changed = true;
        }

        if (!changed) {
            return;
        }

        assignment.updatedAt = new Date();

        await this.assignmentRepository.update(assignment);
    }

    private assertValidSelectValue(
        value: unknown,
        definitionId: string,
        optionIds: string[],
    ): void {
        let rawIds: string[] = [];

        if (
            value &&
            typeof value === "object" &&
            "kind" in value &&
            "value" in value
        ) {
            const kind = (value as { kind?: unknown }).kind;
            const entries = (value as { value?: unknown }).value;
            if (kind !== "select") {
                throw new Error("Select metafields must be saved with kind 'select'.");
            }

            if (!Array.isArray(entries)) {
                throw new Error("Select metafields must be saved with an array value.");
            }

            rawIds = entries.filter((entry): entry is string => typeof entry === "string");
        } else if (Array.isArray(value)) {
            rawIds = value.filter((entry): entry is string => typeof entry === "string");
        } else {
            throw new Error("Select metafields must be saved with select option IDs.");
        }

        if (rawIds.length === 0) {
            return;
        }

        const allowed = new Set(optionIds);
        const invalid = rawIds.filter((id) => !allowed.has(id));
        if (invalid.length > 0) {
            throw new Error(
                `Select metafield ${definitionId} includes unknown option IDs.`,
            );
        }
    }
}
