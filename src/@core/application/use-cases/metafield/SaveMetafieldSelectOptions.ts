import { generateId } from "../../utils/id";
import { normalizeMetafieldName } from "../../utils/normalizeMetafieldName";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";

export interface SaveMetafieldSelectOptionsRequest {
    definitionId: string;
    options: Array<{
        id?: string;
        label: string;
        icon?: string | null;
    }>;
}

export interface SaveMetafieldSelectOptionsResponse {
    definitionId: string;
    options: Array<{
        id: string;
        label: string;
        icon?: string;
    }>;
}

const normalizeIcon = (icon?: string | null): string | undefined => {
    const normalized = icon?.trim();
    return normalized ? normalized : undefined;
};

const toAssignmentSelectIds = (valueJson: unknown): string[] => {
    if (
        valueJson &&
        typeof valueJson === "object" &&
        "kind" in valueJson &&
        "value" in valueJson
    ) {
        const kind = (valueJson as { kind?: unknown }).kind;
        const value = (valueJson as { value?: unknown }).value;
        if (kind === "select" && Array.isArray(value)) {
            return value.filter((entry): entry is string => typeof entry === "string");
        }
    }

    if (Array.isArray(valueJson)) {
        return valueJson.filter((entry): entry is string => typeof entry === "string");
    }

    return [];
};

export class SaveMetafieldSelectOptions {
    constructor(
        private readonly definitionRepository: IMetafieldDefinitionRepository,
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: SaveMetafieldSelectOptionsRequest,
    ): Promise<SaveMetafieldSelectOptionsResponse> {
        const definitionId = request.definitionId.trim();
        if (!definitionId) {
            throw new Error("Metafield definition ID is required.");
        }

        const definition = await this.definitionRepository.findById(definitionId);
        if (!definition) {
            throw new Error("Metafield definition not found.");
        }

        if (definition.valueType !== "string[]") {
            throw new Error("Only select metafields can manage select options.");
        }

        const existingById = new Map(
            definition.selectOptions.map((option) => [option.id, option]),
        );
        const seenLabels = new Set<string>();
        const now = new Date();

        const nextOptions = request.options.reduce<typeof definition.selectOptions>(
            (acc, input) => {
                const label = input.label.trim();
                if (!label) {
                    return acc;
                }

                const labelNormalized = normalizeMetafieldName(label);
                if (!labelNormalized || seenLabels.has(labelNormalized)) {
                    return acc;
                }
                seenLabels.add(labelNormalized);

                const existing = input.id ? existingById.get(input.id) : undefined;
                if (existing) {
                    const normalizedIcon = normalizeIcon(input.icon);
                    acc.push({
                        ...existing,
                        label,
                        labelNormalized,
                        icon:
                            normalizedIcon !== undefined
                                ? normalizedIcon
                                : existing.icon,
                        orderIndex: acc.length,
                        updatedAt: now,
                    });
                    return acc;
                }

                const normalizedIcon = normalizeIcon(input.icon);
                acc.push({
                    id: generateId(),
                    label,
                    labelNormalized,
                    orderIndex: acc.length,
                    ...(normalizedIcon ? { icon: normalizedIcon } : {}),
                    createdAt: now,
                    updatedAt: now,
                });
                return acc;
            },
            [],
        );

        const validOptionIds = new Set(nextOptions.map((option) => option.id));
        const removedOptionIds = new Set(
            definition.selectOptions
                .map((option) => option.id)
                .filter((id) => !validOptionIds.has(id)),
        );

        definition.selectOptions = nextOptions;
        definition.updatedAt = now;
        await this.definitionRepository.update(definition);

        if (removedOptionIds.size > 0) {
            const assignments = await this.assignmentRepository.findByDefinitionId(
                definition.id,
            );

            for (const assignment of assignments) {
                const currentIds = toAssignmentSelectIds(assignment.valueJson);
                const filteredIds = currentIds.filter((id) => validOptionIds.has(id));

                if (currentIds.length === filteredIds.length) {
                    continue;
                }

                assignment.valueJson = {
                    kind: "select",
                    value: filteredIds,
                };
                assignment.updatedAt = now;
                await this.assignmentRepository.update(assignment);
            }
        }

        return {
            definitionId: definition.id,
            options: nextOptions.map((option) => ({
                id: option.id,
                label: option.label,
                ...(option.icon ? { icon: option.icon } : {}),
            })),
        };
    }
}
