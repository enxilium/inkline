import {
    EditorTemplate,
    EditorTemplateFieldKind,
    EditorTemplateType,
} from "../../../domain/entities/story/world/EditorTemplate";
import { MetafieldDefinition } from "../../../domain/entities/story/world/MetafieldDefinition";
import { IEditorTemplateRepository } from "../../../domain/repositories/IEditorTemplateRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { normalizeMetafieldName } from "../../utils/normalizeMetafieldName";
import { generateId } from "../../utils/id";

type DefaultTemplateSeed = {
    name: string;
    valueType: "string" | "string[]";
    kind: EditorTemplateFieldKind;
    column: "left" | "right";
    selectOptions?: string[];
};

const DEFAULT_PERSONALITY_OPTIONS: string[] = [
    "Calm",
    "Curious",
    "Kind",
    "Confident",
    "Loyal",
    "Strategic",
    "Reserved",
    "Optimistic",
    "Stubborn",
    "Cunning",
    "Impulsive",
    "Compassionate",
];

const DEFAULT_POWERS_OPTIONS: string[] = [
    "Swordsmanship",
    "Alchemy",
    "Healing",
    "Stealth",
    "Illusion",
    "Telepathy",
    "Pyrokinesis",
    "Shadow Manipulation",
    "Time Perception",
    "Elemental Control",
    "Beast Bond",
    "Rune Craft",
];

const DEFAULT_TEMPLATE_SEEDS: Record<
    EditorTemplateType,
    DefaultTemplateSeed[]
> = {
    character: [
        { name: "Age", valueType: "string", kind: "field", column: "left" },
        { name: "Race", valueType: "string", kind: "field", column: "left" },
        {
            name: "Personality",
            valueType: "string[]",
            kind: "select",
            column: "left",
            selectOptions: DEFAULT_PERSONALITY_OPTIONS,
        },
        {
            name: "Powers & Abilities",
            valueType: "string[]",
            kind: "select",
            column: "left",
            selectOptions: DEFAULT_POWERS_OPTIONS,
        },
    ],
    location: [],
    organization: [],
};

export async function initializeDefaultEditorTemplates(
    projectId: string,
    now: Date,
    metafieldDefinitionRepository: IMetafieldDefinitionRepository,
    editorTemplateRepository: IEditorTemplateRepository,
): Promise<void> {
    const editorTypes: EditorTemplateType[] = [
        "character",
        "location",
        "organization",
    ];

    for (const editorType of editorTypes) {
        const existingTemplate =
            await editorTemplateRepository.findByProjectAndEditorType(
                projectId,
                editorType,
            );
        if (existingTemplate) {
            continue;
        }

        const seeds = DEFAULT_TEMPLATE_SEEDS[editorType];
        const fields: EditorTemplate["fields"] = [];
        const placementLeft: string[] = [];
        const placementRight: string[] = [];

        for (const seed of seeds) {
            const definition = await findOrCreateDefinition(
                projectId,
                editorType,
                seed,
                now,
                metafieldDefinitionRepository,
            );

            fields.push({
                definitionId: definition.id,
                kind: seed.kind,
                orderIndex: fields.length,
            });
            if (seed.column === "left") {
                placementLeft.push(definition.id);
            } else {
                placementRight.push(definition.id);
            }
        }

        const template = new EditorTemplate(
            generateId(),
            projectId,
            editorType,
            { left: placementLeft, right: placementRight },
            fields,
            now,
            now,
        );

        await editorTemplateRepository.create(template);
    }
}

async function findOrCreateDefinition(
    projectId: string,
    scope: EditorTemplateType,
    seed: DefaultTemplateSeed,
    now: Date,
    metafieldDefinitionRepository: IMetafieldDefinitionRepository,
): Promise<MetafieldDefinition> {
    const normalizedName = normalizeMetafieldName(seed.name);
    const existing =
        await metafieldDefinitionRepository.findByProjectScopeAndNameNormalized(
            projectId,
            scope,
            normalizedName,
        );

    if (existing) {
        return existing;
    }

    const definition = new MetafieldDefinition(
        generateId(),
        projectId,
        seed.name,
        normalizedName,
        scope,
        seed.valueType,
        null,
        createSelectOptions(seed.selectOptions ?? [], now),
        now,
        now,
    );

    await metafieldDefinitionRepository.create(definition);
    return definition;
}

function createSelectOptions(labels: string[], now: Date) {
    const seen = new Set<string>();
    const options: MetafieldDefinition["selectOptions"] = [];

    for (const raw of labels) {
        const label = raw.trim();
        if (!label) {
            continue;
        }

        const normalized = normalizeMetafieldName(label);
        if (!normalized || seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        options.push({
            id: generateId(),
            label,
            labelNormalized: normalized,
            orderIndex: options.length,
            createdAt: now,
            updatedAt: now,
        });
    }

    return options;
}
