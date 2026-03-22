import { generateId } from "../../utils/id";
import {
    EditorTemplate,
    EditorTemplateField,
    EditorTemplatePlacement,
    EditorTemplateType,
} from "../../../domain/entities/story/world/EditorTemplate";
import { MetafieldAssignment } from "../../../domain/entities/story/world/MetafieldAssignment";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IEditorTemplateRepository } from "../../../domain/repositories/IEditorTemplateRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";

export interface SaveEditorTemplateFieldInput {
    definitionId: string;
    kind: "field" | "paragraph" | "select";
}

export interface SaveEditorTemplateRequest {
    projectId: string;
    editorType: EditorTemplateType;
    placement: EditorTemplatePlacement;
    fields: SaveEditorTemplateFieldInput[];
}

export interface SaveEditorTemplateResponse {
    template: EditorTemplate;
}

const makeTemplateAssignmentValue = (
    kind: "field" | "paragraph" | "select",
): unknown =>
    kind === "select"
        ? {
              kind,
              value: [] as string[],
          }
        : {
              kind,
              value: "",
          };

const normalizeAssignmentValueForKind = (
    currentValue: unknown,
    kind: "field" | "paragraph" | "select",
): unknown => {
    const rawValue =
        currentValue &&
        typeof currentValue === "object" &&
        "value" in currentValue
            ? (currentValue as { value?: unknown }).value
            : currentValue;

    if (kind === "select") {
        return {
            kind,
            value: Array.isArray(rawValue)
                ? (rawValue as string[])
                : ([] as string[]),
        };
    }

    return {
        kind,
        value: typeof rawValue === "string" ? rawValue : "",
    };
};

const isScopeAllowed = (
    scope: "character" | "location" | "organization" | "project",
    entityType: EditorTemplateType,
): boolean => {
    if (scope === "project") {
        return true;
    }

    return scope === entityType;
};

const uniqueStrings = (items: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];

    for (const item of items) {
        const normalized = item.trim();
        if (!normalized || seen.has(normalized)) {
            continue;
        }
        seen.add(normalized);
        result.push(normalized);
    }

    return result;
};

const TEMPLATE_CORE_PREFIX = "template-core:";

const isTemplateCorePlacementId = (id: string): boolean =>
    id.startsWith(TEMPLATE_CORE_PREFIX);

const TEMPLATE_CORE_TOKEN_ALLOWLIST: Record<EditorTemplateType, Set<string>> = {
    character: new Set([
        "description",
        "portrait",
        "audio",
        "related-locations",
        "related-organizations",
    ]),
    location: new Set(["description", "portrait", "audio", "presence"]),
    organization: new Set([
        "description",
        "portrait",
        "audio",
        "related-locations",
        "reach",
    ]),
};

const TEMPLATE_CORE_TOKEN_ALIASES: Record<
    EditorTemplateType,
    Record<string, string>
> = {
    character: {
        "current-location": "related-locations",
        "background-location": "related-locations",
        organization: "related-organizations",
    },
    location: {},
    organization: {
        locations: "related-locations",
    },
};

const isAllowedTemplateCorePlacementId = (
    id: string,
    editorType: EditorTemplateType,
): boolean => {
    if (!isTemplateCorePlacementId(id)) {
        return false;
    }

    const token = id.slice(TEMPLATE_CORE_PREFIX.length);
    return TEMPLATE_CORE_TOKEN_ALLOWLIST[editorType].has(token);
};

const normalizeTemplatePlacementId = (
    rawId: string,
    editorType: EditorTemplateType,
): string | null => {
    const id = rawId.trim();
    if (!id) {
        return null;
    }

    if (!isTemplateCorePlacementId(id)) {
        return id;
    }

    const rawToken = id.slice(TEMPLATE_CORE_PREFIX.length);
    const token = TEMPLATE_CORE_TOKEN_ALIASES[editorType][rawToken] ?? rawToken;
    const normalizedId = `${TEMPLATE_CORE_PREFIX}${token}`;

    if (!isAllowedTemplateCorePlacementId(normalizedId, editorType)) {
        return null;
    }

    return normalizedId;
};

export class SaveEditorTemplate {
    constructor(
        private readonly templateRepository: IEditorTemplateRepository,
        private readonly definitionRepository: IMetafieldDefinitionRepository,
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository,
    ) {}

    async execute(
        request: SaveEditorTemplateRequest,
    ): Promise<SaveEditorTemplateResponse> {
        const projectId = request.projectId.trim();
        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        const definitions = await this.definitionRepository.findByProjectId(
            projectId,
        );
        const definitionById = new Map(definitions.map((d) => [d.id, d]));

        const normalizedFields: EditorTemplateField[] = [];
        const seenDefinitionIds = new Set<string>();

        for (const inputField of request.fields) {
            const definitionId = inputField.definitionId.trim();
            if (!definitionId || seenDefinitionIds.has(definitionId)) {
                continue;
            }

            const definition = definitionById.get(definitionId);
            if (!definition || definition.projectId !== projectId) {
                throw new Error("Template references an unknown metafield definition.");
            }

            if (
                definition.valueType !== "string" &&
                definition.valueType !== "string[]"
            ) {
                throw new Error(
                    "Template metafields must be text or select compatible.",
                );
            }

            if (
                inputField.kind === "select" &&
                definition.valueType !== "string[]"
            ) {
                throw new Error(
                    "Select template fields require a list metafield definition.",
                );
            }

            if (!isScopeAllowed(definition.scope, request.editorType)) {
                throw new Error(
                    "Template references a metafield that is not allowed for this editor type.",
                );
            }

            seenDefinitionIds.add(definitionId);
            normalizedFields.push({
                definitionId,
                kind: inputField.kind,
                orderIndex: normalizedFields.length,
            });
        }

        const orderedDefinitionIds = normalizedFields.map(
            (field) => field.definitionId,
        );
        const orderedDefinitionIdSet = new Set(orderedDefinitionIds);

        const placementLeft = uniqueStrings(
            request.placement.left
                .map((id) =>
                    normalizeTemplatePlacementId(id, request.editorType),
                )
                .filter((id): id is string => Boolean(id)),
        ).filter(
            (id) =>
                isAllowedTemplateCorePlacementId(id, request.editorType) ||
                orderedDefinitionIdSet.has(id),
        );
        const placementRight = uniqueStrings(
            request.placement.right
                .map((id) =>
                    normalizeTemplatePlacementId(id, request.editorType),
                )
                .filter((id): id is string => Boolean(id)),
        ).filter(
            (id) =>
                (isAllowedTemplateCorePlacementId(id, request.editorType) ||
                    orderedDefinitionIdSet.has(id)) &&
                !placementLeft.includes(id),
        );

        const unplacedIds = orderedDefinitionIds.filter(
            (id) => !placementLeft.includes(id) && !placementRight.includes(id),
        );

        const placement: EditorTemplatePlacement = {
            left: placementLeft,
            right: [...placementRight, ...unplacedIds],
        };

        const entities = await this.listEntityIdsByType(
            projectId,
            request.editorType,
        );

        for (const entityId of entities) {
            const existingAssignments = await this.assignmentRepository.findByEntity(
                request.editorType,
                entityId,
            );

            const assignmentByDefinitionId = new Map(
                existingAssignments.map((assignment) => [
                    assignment.definitionId,
                    assignment,
                ]),
            );

            for (const assignment of existingAssignments) {
                if (!orderedDefinitionIdSet.has(assignment.definitionId)) {
                    await this.assignmentRepository.delete(assignment.id);
                }
            }

            for (let index = 0; index < orderedDefinitionIds.length; index += 1) {
                const definitionId = orderedDefinitionIds[index];
                const definition = definitionById.get(definitionId);

                if (!definition) {
                    continue;
                }

                const existing = assignmentByDefinitionId.get(definitionId);
                if (!existing) {
                    const now = new Date();
                    const created = new MetafieldAssignment(
                        generateId(),
                        projectId,
                        definitionId,
                        request.editorType,
                        entityId,
                        makeTemplateAssignmentValue(
                            normalizedFields[index].kind,
                        ),
                        index,
                        now,
                        now,
                    );
                    await this.assignmentRepository.create(created);
                    continue;
                }

                const normalizedValue = normalizeAssignmentValueForKind(
                    existing.valueJson,
                    normalizedFields[index].kind,
                );

                if (
                    existing.orderIndex !== index ||
                    JSON.stringify(existing.valueJson) !==
                        JSON.stringify(normalizedValue)
                ) {
                    existing.valueJson = normalizedValue;
                    existing.orderIndex = index;
                    existing.updatedAt = new Date();
                    await this.assignmentRepository.update(existing);
                }
            }
        }

        const existingTemplate =
            await this.templateRepository.findByProjectAndEditorType(
                projectId,
                request.editorType,
            );

        const now = new Date();
        const template = existingTemplate
            ? new EditorTemplate(
                  existingTemplate.id,
                  existingTemplate.projectId,
                  existingTemplate.editorType,
                  placement,
                  normalizedFields,
                  existingTemplate.createdAt,
                  now,
              )
            : new EditorTemplate(
                  generateId(),
                  projectId,
                  request.editorType,
                  placement,
                  normalizedFields,
                  now,
                  now,
              );

        if (existingTemplate) {
            await this.templateRepository.update(template);
        } else {
            await this.templateRepository.create(template);
        }

        return { template };
    }

    private async listEntityIdsByType(
        projectId: string,
        editorType: EditorTemplateType,
    ): Promise<string[]> {
        if (editorType === "character") {
            const characters = await this.characterRepository.findByProjectId(
                projectId,
            );
            return characters.map((item) => item.id);
        }

        if (editorType === "location") {
            const locations = await this.locationRepository.findByProjectId(
                projectId,
            );
            return locations.map((item) => item.id);
        }

        const organizations = await this.organizationRepository.findByProjectId(
            projectId,
        );
        return organizations.map((item) => item.id);
    }
}
