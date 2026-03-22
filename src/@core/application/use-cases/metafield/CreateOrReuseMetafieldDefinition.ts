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
    selectOptions?: Array<
        | string
        | {
              label: string;
              icon?: string | null;
          }
    >;
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

        const now = new Date();

        const normalizedSelectOptions =
            request.valueType === "string[]"
                ? this.normalizeSelectOptions(request.selectOptions ?? [], now)
                : [];

        if (request.valueType !== "string[]" && request.selectOptions?.length) {
            throw new Error(
                "Only select metafields can include select options.",
            );
        }

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

            if (existing.valueType === "string[]" && normalizedSelectOptions.length) {
                const byNormalized = new Map(
                    existing.selectOptions.map((option) => [
                        option.labelNormalized,
                        option,
                    ]),
                );
                let nextOrderIndex =
                    existing.selectOptions.reduce(
                        (max, option) => Math.max(max, option.orderIndex),
                        -1,
                    ) + 1;

                for (const option of normalizedSelectOptions) {
                    if (byNormalized.has(option.labelNormalized)) {
                        continue;
                    }

                    const createdOption = {
                        ...option,
                        orderIndex: nextOrderIndex,
                    };
                    nextOrderIndex += 1;
                    existing.selectOptions.push(createdOption);
                    byNormalized.set(createdOption.labelNormalized, createdOption);
                }

                existing.selectOptions.sort(
                    (left, right) => left.orderIndex - right.orderIndex,
                );
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
            normalizedSelectOptions,
            now,
            now,
        );

        await this.definitionRepository.create(definition);

        return {
            definition,
            created: true,
        };
    }

    private normalizeSelectOptions(
        entries: Array<string | { label: string; icon?: string | null }>,
        now: Date,
    ) {
        const seen = new Set<string>();
        const normalized: Array<{
            id: string;
            label: string;
            labelNormalized: string;
            orderIndex: number;
            icon?: string;
            createdAt: Date;
            updatedAt: Date;
        }> = [];

        for (const entry of entries) {
            const rawLabel =
                typeof entry === "string" ? entry : String(entry.label ?? "");
            const label = rawLabel.trim();
            if (!label) {
                continue;
            }

            const normalizedLabel = normalizeMetafieldName(label);
            if (!normalizedLabel || seen.has(normalizedLabel)) {
                continue;
            }

            seen.add(normalizedLabel);

            const rawIcon =
                typeof entry === "string" ? undefined : entry.icon ?? undefined;
            const icon = rawIcon?.trim() || undefined;

            normalized.push({
                id: generateId(),
                label,
                labelNormalized: normalizedLabel,
                orderIndex: normalized.length,
                ...(icon ? { icon } : {}),
                createdAt: now,
                updatedAt: now,
            });
        }

        return normalized;
    }
}
