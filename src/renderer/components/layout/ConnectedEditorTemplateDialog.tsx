import React from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragMoveEvent,
    type DragOverEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useAppStore } from "../../state/appStore";
import type { WorkspaceEditorTemplateType } from "../../types";
import { Button } from "../ui/Button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogModalEditorContent,
    DialogTitle,
} from "../ui/Dialog";
import { GripVerticalIcon, PenLineIcon, TrashIcon } from "../ui/Icons";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { normalizeUserFacingError } from "../../utils/userFacingError";
import { SelectOptionIconPickerDialog } from "./SelectOptionIconPickerDialog";
import { renderSelectOptionIcon } from "../ui/selectOptionIconCatalog";

type EditorTemplateDialogProps = {
    open: boolean;
    editorType: WorkspaceEditorTemplateType | null;
    onOpenChange: (open: boolean) => void;
};

type TemplateDraftField = {
    definitionId: string;
    kind: "field" | "paragraph" | "select";
    column: "left" | "right";
};

type SectionPlacement = {
    left: string[];
    right: string[];
};

type TemplateStaticCard = {
    id: string;
    title: string;
    column: "left" | "right";
};

type TemplateSelectOptionDraft = {
    id?: string;
    label: string;
    icon?: string;
};

const toSortedSelectOptionSnapshot = (
    selectOptionsByDefinitionId: Record<string, TemplateSelectOptionDraft[]>,
) => {
    return Object.keys(selectOptionsByDefinitionId)
        .sort()
        .map((definitionId) => ({
            definitionId,
            options: normalizeTemplateSelectOptions(
                selectOptionsByDefinitionId[definitionId] ?? [],
            ).map((option) => ({
                ...(option.id ? { id: option.id } : {}),
                label: option.label,
                ...(option.icon ? { icon: option.icon } : {}),
            })),
        }));
};

const buildTemplateDraftSignature = (input: {
    fields: TemplateDraftField[];
    placement: SectionPlacement;
    selectOptionsByDefinitionId: Record<string, TemplateSelectOptionDraft[]>;
    templateNewFieldName: string;
    templateNewFieldKind: "field" | "paragraph" | "select";
    templateNewFieldOptionsDraft: TemplateSelectOptionDraft[];
}): string => {
    const fields = input.fields
        .map((field) => ({
            definitionId: field.definitionId,
            kind: field.kind,
            column: field.column,
        }))
        .sort((left, right) =>
            left.definitionId.localeCompare(right.definitionId),
        );

    return JSON.stringify({
        fields,
        placement: {
            left: input.placement.left,
            right: input.placement.right,
        },
        selectOptionsByDefinitionId: toSortedSelectOptionSnapshot(
            input.selectOptionsByDefinitionId,
        ),
        templateNewFieldName: input.templateNewFieldName.trim(),
        templateNewFieldKind: input.templateNewFieldKind,
        templateNewFieldOptionsDraft: normalizeTemplateSelectOptions(
            input.templateNewFieldOptionsDraft,
        ).map((option) => ({
            ...(option.id ? { id: option.id } : {}),
            label: option.label,
            ...(option.icon ? { icon: option.icon } : {}),
        })),
    });
};

const TEMPLATE_STATIC_CARD_SETS: Record<
    WorkspaceEditorTemplateType,
    TemplateStaticCard[]
> = {
    character: [
        {
            id: "template-core:description",
            title: "Description",
            column: "left",
        },
        { id: "template-core:portrait", title: "Portrait", column: "right" },
        {
            id: "template-core:audio",
            title: "Audio Assets",
            column: "right",
        },
        {
            id: "template-core:related-locations",
            title: "Related Locations",
            column: "right",
        },
        {
            id: "template-core:related-organizations",
            title: "Related Organizations",
            column: "right",
        },
    ],
    location: [
        {
            id: "template-core:description",
            title: "Description",
            column: "left",
        },
        { id: "template-core:portrait", title: "Portrait", column: "right" },
        {
            id: "template-core:audio",
            title: "Audio Assets",
            column: "right",
        },
        {
            id: "template-core:presence",
            title: "Presence",
            column: "right",
        },
    ],
    organization: [
        {
            id: "template-core:description",
            title: "Description",
            column: "left",
        },
        { id: "template-core:portrait", title: "Portrait", column: "right" },
        {
            id: "template-core:audio",
            title: "Audio Assets",
            column: "right",
        },
        {
            id: "template-core:related-locations",
            title: "Locations",
            column: "right",
        },
        {
            id: "template-core:reach",
            title: "Reach",
            column: "right",
        },
    ],
};

const TEMPLATE_STATIC_TOKEN_ALIASES: Record<
    WorkspaceEditorTemplateType,
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

const toTemplateCardItemId = (definitionId: string): string =>
    `template-field:${definitionId}`;

const toTemplateDefinitionId = (itemId: string): string | null =>
    itemId.startsWith("template-field:")
        ? itemId.slice("template-field:".length)
        : null;

const isTemplateCardItemId = (itemId: string): boolean =>
    itemId.startsWith("template-field:");

const findTemplateColumnForItem = (
    placement: SectionPlacement,
    itemId: string,
): "left" | "right" | null => {
    if (placement.left.includes(itemId)) {
        return "left";
    }
    if (placement.right.includes(itemId)) {
        return "right";
    }
    return null;
};

const areSamePlacement = (
    a: SectionPlacement,
    b: SectionPlacement,
): boolean => {
    if (a.left.length !== b.left.length || a.right.length !== b.right.length) {
        return false;
    }

    const sameLeft = a.left.every((itemId, index) => itemId === b.left[index]);
    if (!sameLeft) {
        return false;
    }

    return a.right.every((itemId, index) => itemId === b.right[index]);
};

const normalizeTemplatePlacement = ({
    left,
    right,
    staticLeftItems,
    staticRightItems,
    validFieldItemIds,
}: {
    left: string[];
    right: string[];
    staticLeftItems: string[];
    staticRightItems: string[];
    validFieldItemIds: string[];
}): SectionPlacement => {
    const allowedItemIds = new Set([
        ...staticLeftItems,
        ...staticRightItems,
        ...validFieldItemIds,
    ]);
    const seen = new Set<string>();

    const normalizedLeft: string[] = [];
    for (const itemId of left) {
        if (!allowedItemIds.has(itemId) || seen.has(itemId)) {
            continue;
        }
        seen.add(itemId);
        normalizedLeft.push(itemId);
    }

    const normalizedRight: string[] = [];
    for (const itemId of right) {
        if (!allowedItemIds.has(itemId) || seen.has(itemId)) {
            continue;
        }
        seen.add(itemId);
        normalizedRight.push(itemId);
    }

    for (const itemId of staticLeftItems) {
        if (seen.has(itemId)) {
            continue;
        }
        seen.add(itemId);
        normalizedLeft.push(itemId);
    }

    for (const itemId of staticRightItems) {
        if (seen.has(itemId)) {
            continue;
        }
        seen.add(itemId);
        normalizedRight.push(itemId);
    }

    for (const itemId of validFieldItemIds) {
        if (seen.has(itemId)) {
            continue;
        }
        seen.add(itemId);
        normalizedLeft.push(itemId);
    }

    return {
        left: normalizedLeft,
        right: normalizedRight,
    };
};

const editorTypeLabel = (editorType: WorkspaceEditorTemplateType): string => {
    if (editorType === "character") {
        return "Character";
    }
    if (editorType === "location") {
        return "Location";
    }
    return "Organization";
};

const renderTemplateKindPlaceholder = (
    kind: TemplateDraftField["kind"],
): React.ReactNode => {
    if (kind === "field") {
        return (
            <div className="template-kind-placeholder" aria-hidden="true">
                <div className="template-kind-placeholder__field-line" />
            </div>
        );
    }

    if (kind === "paragraph") {
        return (
            <div className="template-kind-placeholder" aria-hidden="true">
                <div className="template-kind-placeholder__paragraph-block" />
            </div>
        );
    }

    return (
        <div className="template-kind-placeholder" aria-hidden="true">
            <div className="template-kind-placeholder__chips">
                <span className="template-kind-placeholder__chip" />
                <span className="template-kind-placeholder__chip" />
                <span className="template-kind-placeholder__chip" />
            </div>
        </div>
    );
};

const renderStaticTemplateCardPlaceholder = (
    staticCardId: string,
): React.ReactNode => {
    if (staticCardId === "template-core:description") {
        return (
            <div className="template-kind-placeholder" aria-hidden="true">
                <div className="template-kind-placeholder__paragraph-block" />
            </div>
        );
    }

    if (staticCardId === "template-core:portrait") {
        return (
            <div className="template-static-portrait-placeholder" aria-hidden="true">
                <div className="template-static-portrait-placeholder__square" />
            </div>
        );
    }

    return null;
};

const normalizeTemplateSelectOptions = (
    options: Array<{
        id?: string;
        label: string;
        icon?: string | null;
    }>,
): TemplateSelectOptionDraft[] => {
    const seen = new Set<string>();
    const normalizedOptions: TemplateSelectOptionDraft[] = [];

    for (const option of options) {
        const label = option.label.trim();
        if (!label) {
            continue;
        }

        const normalized = label.toLowerCase();
        if (seen.has(normalized)) {
            continue;
        }

        seen.add(normalized);
        const icon = option.icon?.trim() || undefined;
        normalizedOptions.push({
            ...(option.id ? { id: option.id } : {}),
            label,
            ...(icon ? { icon } : {}),
        });
    }

    return normalizedOptions;
};

const sortTemplateSelectOptions = (
    options: Array<
        TemplateSelectOptionDraft & {
            orderIndex?: number;
        }
    >,
): TemplateSelectOptionDraft[] =>
    options
        .slice()
        .sort((left, right) => {
            const leftOrder = (left as { orderIndex?: number }).orderIndex ?? 0;
            const rightOrder = (right as { orderIndex?: number }).orderIndex ?? 0;
            return leftOrder - rightOrder;
        });

type SortableSectionCardProps = {
    id: string;
    title: string;
    children: React.ReactNode;
    className?: string;
    disableDrag?: boolean;
    showDragHandle?: boolean;
    headerActions?: React.ReactNode;
};

const SortableSectionCard: React.FC<SortableSectionCardProps> = ({
    id,
    title,
    children,
    className,
    disableDrag = false,
    showDragHandle = true,
    headerActions,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        disabled: disableDrag,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <section
            ref={setNodeRef}
            style={style}
            className={`entity-section-card${className ? ` ${className}` : ""}${isDragging ? " is-dragging" : ""}`}
        >
            <div className="entity-section-card-header">
                <p className="panel-label">{title}</p>
                <div className="entity-section-card-actions">
                    {headerActions}
                    {showDragHandle ? (
                        <button
                            type="button"
                            className="entity-section-card-handle"
                            aria-label={`Reorder ${title} section`}
                            {...attributes}
                            {...listeners}
                        >
                            <GripVerticalIcon size={14} />
                        </button>
                    ) : null}
                </div>
            </div>
            <div className="entity-section-card-body">{children}</div>
        </section>
    );
};

type TemplateSelectOptionsEditorProps = {
    options: TemplateSelectOptionDraft[];
    disabled: boolean;
    addPlaceholder?: string;
    onAddOption: (label: string) => void;
    onOptionLabelChange: (option: TemplateSelectOptionDraft, label: string) => void;
    onOptionLabelBlur?: (option: TemplateSelectOptionDraft) => void;
    onOptionDelete: (option: TemplateSelectOptionDraft) => void;
    onOptionIconEdit: (option: TemplateSelectOptionDraft, optionIndex: number) => void;
};

const TemplateSelectOptionsEditor: React.FC<TemplateSelectOptionsEditorProps> = ({
    options,
    disabled,
    addPlaceholder = "Add option and press Enter",
    onAddOption,
    onOptionLabelChange,
    onOptionLabelBlur,
    onOptionDelete,
    onOptionIconEdit,
}) => {
    const [draft, setDraft] = React.useState("");

    const submitDraft = React.useCallback(() => {
        const label = draft.trim();
        if (!label) {
            return;
        }

        onAddOption(label);
        setDraft("");
    }, [draft, onAddOption]);

    return (
        <div className="template-select-options-editor">
            <div className="template-select-options-chip-grid">
                {options.map((option, index) => (
                    <div
                        key={option.id ?? `${option.label}:${index}`}
                        className="template-select-option-chip"
                    >
                        <button
                            type="button"
                            className="template-select-option-chip-icon-btn"
                            onClick={() => onOptionIconEdit(option, index)}
                            disabled={disabled}
                            aria-label={`Edit icon for ${option.label}`}
                        >
                            <span className="template-select-option-chip-icon-default">
                                {renderSelectOptionIcon(option.icon, 15)}
                            </span>
                            <span className="template-select-option-chip-icon-hover">
                                <PenLineIcon size={11} />
                            </span>
                        </button>
                        <input
                            className="template-select-option-chip-label-input"
                            value={option.label}
                            onChange={(event) =>
                                onOptionLabelChange(option, event.target.value)
                            }
                            onBlur={() => onOptionLabelBlur?.(option)}
                            disabled={disabled}
                        />
                        <button
                            type="button"
                            className="template-select-option-chip-trash-btn"
                            onClick={() => onOptionDelete(option)}
                            disabled={disabled}
                            aria-label={`Delete ${option.label}`}
                        >
                            <TrashIcon size={12} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="template-select-options-add-row">
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter") {
                            event.preventDefault();
                            submitDraft();
                        }
                    }}
                    placeholder={addPlaceholder}
                    disabled={disabled}
                />
                <Button
                    type="button"
                    variant="ghost"
                    onClick={submitDraft}
                    disabled={disabled || !draft.trim()}
                >
                    Add
                </Button>
            </div>
        </div>
    );
};

export const ConnectedEditorTemplateDialog: React.FC<EditorTemplateDialogProps> = ({
    open,
    editorType,
    onOpenChange,
}) => {
    const {
        projectId,
        editorTemplates,
        metafieldDefinitions,
        metafieldAssignments,
        createOrReuseMetafieldDefinition,
        saveMetafieldSelectOptions,
        saveEditorTemplate,
        reloadProjectTemplateData,
    } = useAppStore();

    const [isSavingTemplate, setIsSavingTemplate] = React.useState(false);
    const [templateDraftError, setTemplateDraftError] = React.useState<
        string | null
    >(null);
    const [templateNewFieldName, setTemplateNewFieldName] = React.useState("");
    const [templateNewFieldKind, setTemplateNewFieldKind] = React.useState<
        "field" | "paragraph" | "select"
    >("field");
    const [templateNewFieldOptionsDraft, setTemplateNewFieldOptionsDraft] =
        React.useState<TemplateSelectOptionDraft[]>([]);
    const [createdDefinitionsById, setCreatedDefinitionsById] = React.useState<
        Map<
            string,
            {
                id: string;
                name: string;
                valueType:
                    | "string"
                    | "string[]"
                    | "entity"
                    | "entity[]"
                    | "image"
                    | "image[]";
                scope: "character" | "location" | "organization" | "project";
                selectOptions?: Array<{
                    id: string;
                    label: string;
                    orderIndex: number;
                    icon?: string;
                }>;
            }
        >
    >(new Map());
    const [templateSelectOptionsByDefinitionId, setTemplateSelectOptionsByDefinitionId] =
        React.useState<Record<string, TemplateSelectOptionDraft[]>>({});
    const [pendingSelectOptionDelete, setPendingSelectOptionDelete] =
        React.useState<{
            definitionId: string;
            optionId: string;
            optionLabel: string;
            usageCount: number;
        } | null>(null);
    const [iconPickerTarget, setIconPickerTarget] = React.useState<
        | {
              kind: "new";
              optionIndex: number;
          }
        | {
              kind: "existing";
              definitionId: string;
              optionId: string;
          }
        | null
    >(null);
    const [templateDraftFields, setTemplateDraftFields] = React.useState<
        TemplateDraftField[]
    >([]);
    const [templateSectionPlacement, setTemplateSectionPlacement] =
        React.useState<SectionPlacement>({
            left: [],
            right: [],
        });
    const dialogModalEditorRef = React.useRef<HTMLDivElement | null>(null);
    const templateDragScrollBoundsRef = React.useRef<
        { min: number; max: number } | null
    >(null);
    const [templateDragPlacementSnapshot, setTemplateDragPlacementSnapshot] =
        React.useState<SectionPlacement | null>(null);
    const lastProcessedDragOverKeyRef = React.useRef<string | null>(null);
    const templateInitSignatureRef = React.useRef<string | null>(null);
    const dragOverRafRef = React.useRef<number | null>(null);
    const pendingDragOverRef = React.useRef<
        { activeId: string; overId: string } | null
    >(null);
    const staticCards = React.useMemo<TemplateStaticCard[]>(() => {
        if (!editorType) {
            return [];
        }

        return TEMPLATE_STATIC_CARD_SETS[editorType];
    }, [editorType]);

    const staticCardIds = React.useMemo(
        () => new Set(staticCards.map((card) => card.id)),
        [staticCards],
    );

    const staticLeftItems = React.useMemo(
        () => staticCards.filter((card) => card.column === "left").map((card) => card.id),
        [staticCards],
    );

    const staticRightItems = React.useMemo(
        () => staticCards.filter((card) => card.column === "right").map((card) => card.id),
        [staticCards],
    );

    const staticCardById = React.useMemo(
        () => new Map(staticCards.map((card) => [card.id, card])),
        [staticCards],
    );

    const [pendingTemplateDeleteDefinitionId, setPendingTemplateDeleteDefinitionId] =
        React.useState<string | null>(null);
    const [pendingUnsavedCloseConfirm, setPendingUnsavedCloseConfirm] =
        React.useState(false);
    const initialTemplateDraftSignatureRef = React.useRef<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const template = React.useMemo(() => {
        if (!editorType) {
            return null;
        }

        return (
            editorTemplates.find(
                (entry) => entry.editorType === editorType,
            ) ?? null
        );
    }, [editorTemplates, editorType]);

    const templateDefinitionOptions = React.useMemo(() => {
        if (!editorType) {
            return [];
        }

        const eligibleStoreDefinitions = metafieldDefinitions.filter((definition) => {
            if (definition.name.startsWith("_sys:")) {
                return false;
            }

            if (
                definition.valueType !== "string" &&
                definition.valueType !== "string[]"
            ) {
                return false;
            }

            return (
                definition.scope === "project" || definition.scope === editorType
            );
        });

        const existingIds = new Set(
            eligibleStoreDefinitions.map((definition) => definition.id),
        );
        const optimisticDefinitions = [...createdDefinitionsById.values()].filter(
            (definition) => {
                if (existingIds.has(definition.id)) {
                    return false;
                }

                if (definition.name.startsWith("_sys:")) {
                    return false;
                }

                if (
                    definition.valueType !== "string" &&
                    definition.valueType !== "string[]"
                ) {
                    return false;
                }

                return (
                    definition.scope === "project" || definition.scope === editorType
                );
            },
        );

        return [...eligibleStoreDefinitions, ...optimisticDefinitions];
    }, [createdDefinitionsById, editorType, metafieldDefinitions]);

    const templateDefinitionById = React.useMemo(
        () =>
            new Map(
                templateDefinitionOptions.map((definition) => [
                    definition.id,
                    definition,
                ]),
            ),
        [templateDefinitionOptions],
    );

    const templateDraftByDefinitionId = React.useMemo(
        () =>
            new Map(
                templateDraftFields.map((field) => [field.definitionId, field]),
            ),
        [templateDraftFields],
    );

    const isTemplateSortableItemId = React.useCallback(
        (itemId: string) =>
            isTemplateCardItemId(itemId) || staticCardIds.has(itemId),
        [staticCardIds],
    );

    React.useEffect(() => {
        if (!open || !editorType) {
            templateInitSignatureRef.current = null;
            return;
        }

        const templateSignature = `${editorType}:${template?.id ?? "none"}:${template?.fields.length ?? 0}:${template?.placement.left.join(",") ?? ""}:${template?.placement.right.join(",") ?? ""}:${metafieldDefinitions.length}`;
        if (templateInitSignatureRef.current === templateSignature) {
            return;
        }
        templateInitSignatureRef.current = templateSignature;

        const placementIdToItemId = (placementId: string): string | null => {
            if (placementId.startsWith("template-core:")) {
                const token = placementId.slice("template-core:".length);
                const normalizedToken =
                    TEMPLATE_STATIC_TOKEN_ALIASES[editorType][token] ?? token;
                const normalizedId = `template-core:${normalizedToken}`;
                if (staticCardIds.has(normalizedId)) {
                    return normalizedId;
                }
            }

            if (templateDefinitionById.has(placementId)) {
                return toTemplateCardItemId(placementId);
            }

            return null;
        };

        const nextDraftFields: TemplateDraftField[] = template
            ? template.fields
                  .slice()
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .filter((field) =>
                      templateDefinitionById.has(field.definitionId),
                  )
                  .map((field) => ({
                      definitionId: field.definitionId,
                      kind: field.kind,
                      column: template.placement.right.includes(field.definitionId)
                          ? "right"
                          : "left",
                  }))
            : [];

        const nextLeftFromTemplate = template
            ? template.placement.left
                  .map((placementId) => placementIdToItemId(placementId))
                  .filter((itemId): itemId is string => Boolean(itemId))
            : [];
        const nextRightFromTemplate = template
            ? template.placement.right
                  .map((placementId) => placementIdToItemId(placementId))
                  .filter((itemId): itemId is string => Boolean(itemId))
            : [];

        const fieldItemIds = nextDraftFields.map((field) =>
            toTemplateCardItemId(field.definitionId),
        );
        const nextPlacement = normalizeTemplatePlacement({
            left: nextLeftFromTemplate,
            right: nextRightFromTemplate,
            staticLeftItems,
            staticRightItems,
            validFieldItemIds: fieldItemIds,
        });

        setTemplateDraftFields(nextDraftFields);
        setTemplateSectionPlacement(nextPlacement);
        setTemplateNewFieldName("");
        setTemplateNewFieldKind("field");
        setTemplateNewFieldOptionsDraft([]);
        setTemplateDraftError(null);
        setPendingTemplateDeleteDefinitionId(null);
        setPendingSelectOptionDelete(null);
        setPendingUnsavedCloseConfirm(false);
        setIconPickerTarget(null);
        setTemplateDragPlacementSnapshot(null);
        lastProcessedDragOverKeyRef.current = null;
        const nextSelectOptionsByDefinitionId: Record<
            string,
            TemplateSelectOptionDraft[]
        > = {};
        for (const field of nextDraftFields) {
            if (field.kind !== "select") {
                continue;
            }

            const definition = templateDefinitionById.get(field.definitionId);
            nextSelectOptionsByDefinitionId[field.definitionId] =
                sortTemplateSelectOptions(
                    (definition?.selectOptions as Array<{
                        id: string;
                        label: string;
                        icon?: string;
                        orderIndex?: number;
                    }> | undefined) ?? [],
                ).map((option) => ({
                    id: option.id,
                    label: option.label,
                    ...(option.icon ? { icon: option.icon } : {}),
                }));
        }
        setTemplateSelectOptionsByDefinitionId(nextSelectOptionsByDefinitionId);
        initialTemplateDraftSignatureRef.current = buildTemplateDraftSignature({
            fields: nextDraftFields,
            placement: nextPlacement,
            selectOptionsByDefinitionId: nextSelectOptionsByDefinitionId,
            templateNewFieldName: "",
            templateNewFieldKind: "field",
            templateNewFieldOptionsDraft: [],
        });
        setCreatedDefinitionsById((current) =>
            current.size === 0 ? current : new Map(),
        );
    }, [
        editorType,
        metafieldDefinitions.length,
        open,
        staticLeftItems,
        staticRightItems,
        template,
        templateDefinitionById,
    ]);

    React.useEffect(() => {
        if (!open) {
            return;
        }

        const templateFieldIds = templateDraftFields.map((field) =>
            toTemplateCardItemId(field.definitionId),
        );

        setTemplateSectionPlacement((current) => {
            const normalized = normalizeTemplatePlacement({
                left: current.left,
                right: current.right,
                staticLeftItems,
                staticRightItems,
                validFieldItemIds: templateFieldIds,
            });
            return areSamePlacement(normalized, current) ? current : normalized;
        });
    }, [open, staticLeftItems, staticRightItems, templateDraftFields]);

    const createAndAddTemplateField = React.useCallback(async () => {
        if (!editorType || !projectId) {
            return;
        }

        const name = templateNewFieldName.trim();
        if (!name) {
            setTemplateDraftError("Metafield name is required.");
            return;
        }

        setTemplateDraftError(null);

        try {
            const response = await createOrReuseMetafieldDefinition({
                projectId,
                name,
                scope: editorType,
                valueType: templateNewFieldKind === "select" ? "string[]" : "string",
            });

            setCreatedDefinitionsById((current) => {
                const next = new Map(current);
                next.set(response.definition.id, {
                    id: response.definition.id,
                    name: response.definition.name,
                    valueType: response.definition.valueType,
                    scope: response.definition.scope,
                    selectOptions: response.definition.selectOptions,
                });
                return next;
            });

            const definitionId = response.definition.id;
            if (
                templateDraftFields.some(
                    (field) => field.definitionId === definitionId,
                )
            ) {
                setTemplateDraftError(
                    "This metafield is already in the template.",
                );
                return;
            }

            setTemplateDraftFields((current) => [
                ...current,
                {
                    definitionId,
                    kind: templateNewFieldKind,
                    column: "left",
                },
            ]);
            setTemplateSectionPlacement((current) => ({
                left: [...current.left, toTemplateCardItemId(definitionId)],
                right: current.right,
            }));
            setTemplateNewFieldName("");
            setTemplateNewFieldKind("field");
            setTemplateNewFieldOptionsDraft([]);
            setTemplateSelectOptionsByDefinitionId((current) => ({
                ...current,
                [definitionId]: sortTemplateSelectOptions(
                    response.definition.selectOptions as Array<{
                        id: string;
                        label: string;
                        icon?: string;
                        orderIndex?: number;
                    }>,
                ).map((option) => ({
                    id: option.id,
                    label: option.label,
                    ...(option.icon ? { icon: option.icon } : {}),
                })),
            }));
        } catch (error) {
            setTemplateDraftError(
                normalizeUserFacingError(error, "Failed to create metafield."),
            );
        }
    }, [
        createOrReuseMetafieldDefinition,
        editorType,
        projectId,
        templateDraftFields,
        templateNewFieldKind,
        templateNewFieldName,
        templateNewFieldOptionsDraft,
    ]);

    const removeTemplateDraftField = React.useCallback((definitionId: string) => {
        const itemId = toTemplateCardItemId(definitionId);
        setTemplateDraftFields((current) =>
            current.filter((field) => field.definitionId !== definitionId),
        );
        setTemplateSectionPlacement((placement) => ({
            left: placement.left.filter((id) => id !== itemId),
            right: placement.right.filter((id) => id !== itemId),
        }));
        setTemplateSelectOptionsByDefinitionId((current) => {
            const next = { ...current };
            delete next[definitionId];
            return next;
        });
        setTemplateDraftError(null);
    }, []);

    const persistTemplateSelectOptions = React.useCallback(
        async (
            definitionId: string,
            optionsDraft?: TemplateSelectOptionDraft[],
        ) => {
            const options = normalizeTemplateSelectOptions(
                optionsDraft ??
                    templateSelectOptionsByDefinitionId[definitionId] ??
                    [],
            );

            const definition = templateDefinitionById.get(definitionId);
            if (!definition || definition.valueType !== "string[]") {
                return;
            }

            const existingOptions =
                (definition.selectOptions as Array<{
                    id: string;
                    label: string;
                    icon?: string;
                    orderIndex?: number;
                }> | undefined) ?? [];

            const existingByNormalized = new Map(
                existingOptions.map((option) => [
                    option.label.trim().toLowerCase(),
                    option,
                ]),
            );

            const response = await saveMetafieldSelectOptions({
                definitionId,
                options: options.map((option) => ({
                    id:
                        option.id ??
                        existingByNormalized.get(option.label.toLowerCase())?.id,
                    label: option.label,
                    ...(option.icon ? { icon: option.icon } : {}),
                })),
            });

            setTemplateSelectOptionsByDefinitionId((current) => ({
                ...current,
                [definitionId]: response.options.map((option) => ({
                    id: option.id,
                    label: option.label,
                    ...(option.icon ? { icon: option.icon } : {}),
                })),
            }));

            setCreatedDefinitionsById((current) => {
                const definitionEntry = current.get(definitionId);
                if (!definitionEntry) {
                    return current;
                }

                const next = new Map(current);
                next.set(definitionId, {
                    ...definitionEntry,
                    selectOptions: response.options.map((option, index) => ({
                        id: option.id,
                        label: option.label,
                        orderIndex: index,
                        ...(option.icon ? { icon: option.icon } : {}),
                    })),
                });
                return next;
            });

            return response.options;
        },
        [
            saveMetafieldSelectOptions,
            templateDefinitionById,
            templateSelectOptionsByDefinitionId,
        ],
    );

    const addNewFieldOption = React.useCallback((label: string) => {
        const normalized = normalizeTemplateSelectOptions([
            ...templateNewFieldOptionsDraft,
            { label },
        ]);
        setTemplateNewFieldOptionsDraft(normalized);
    }, [templateNewFieldOptionsDraft]);

    const updateNewFieldOptionLabel = React.useCallback(
        (optionIndex: number, label: string) => {
            const next = templateNewFieldOptionsDraft.map((option, index) =>
                index === optionIndex
                    ? {
                          ...option,
                          label,
                      }
                    : option,
            );
            setTemplateNewFieldOptionsDraft(next);
        },
        [templateNewFieldOptionsDraft],
    );

    const blurNewFieldOptionLabel = React.useCallback(() => {
        setTemplateNewFieldOptionsDraft((current) =>
            normalizeTemplateSelectOptions(current),
        );
    }, []);

    const deleteNewFieldOption = React.useCallback((optionIndex: number) => {
        setTemplateNewFieldOptionsDraft((current) =>
            current.filter((_, index) => index !== optionIndex),
        );
    }, []);

    const updateNewFieldOptionIcon = React.useCallback(
        (optionIndex: number, iconKey: string) => {
            const next = templateNewFieldOptionsDraft.map((option, index) =>
                index === optionIndex
                    ? {
                          ...option,
                          icon: iconKey,
                      }
                    : option,
            );
            setTemplateNewFieldOptionsDraft(next);
        },
        [templateNewFieldOptionsDraft],
    );

    const addExistingDefinitionOption = React.useCallback(
        async (definitionId: string, label: string) => {
            const current = templateSelectOptionsByDefinitionId[definitionId] ?? [];
            const next = normalizeTemplateSelectOptions([...current, { label }]);
            setTemplateSelectOptionsByDefinitionId((prev) => ({
                ...prev,
                [definitionId]: next,
            }));
            await persistTemplateSelectOptions(definitionId, next);
        },
        [persistTemplateSelectOptions, templateSelectOptionsByDefinitionId],
    );

    const updateExistingDefinitionOptionLabel = React.useCallback(
        (definitionId: string, optionId: string, label: string) => {
            setTemplateSelectOptionsByDefinitionId((prev) => {
                const current = prev[definitionId] ?? [];
                const next = current.map((option) =>
                    option.id === optionId
                        ? {
                              ...option,
                              label,
                          }
                        : option,
                );
                return {
                    ...prev,
                    [definitionId]: next,
                };
            });
        },
        [],
    );

    const blurExistingDefinitionOptionLabel = React.useCallback(
        async (definitionId: string) => {
            const current = templateSelectOptionsByDefinitionId[definitionId] ?? [];
            await persistTemplateSelectOptions(definitionId, current);
        },
        [persistTemplateSelectOptions, templateSelectOptionsByDefinitionId],
    );

    const requestExistingDefinitionOptionDelete = React.useCallback(
        (definitionId: string, optionId: string, optionLabel: string) => {
            const usageCount = metafieldAssignments.filter((assignment) => {
                if (
                    assignment.definitionId !== definitionId ||
                    assignment.entityType !== editorType
                ) {
                    return false;
                }

                const valueJson = assignment.valueJson;
                if (
                    valueJson &&
                    typeof valueJson === "object" &&
                    "kind" in valueJson &&
                    "value" in valueJson
                ) {
                    const kind = (valueJson as { kind?: unknown }).kind;
                    const value = (valueJson as { value?: unknown }).value;
                    if (kind !== "select" || !Array.isArray(value)) {
                        return false;
                    }

                    return value.some((entry) => entry === optionId);
                }

                if (!Array.isArray(valueJson)) {
                    return false;
                }

                return valueJson.some((entry) => entry === optionId);
            }).length;

            if (usageCount === 0) {
                void (async () => {
                    const current =
                        templateSelectOptionsByDefinitionId[definitionId] ?? [];
                    const next = current.filter((option) => option.id !== optionId);
                    setTemplateSelectOptionsByDefinitionId((prev) => ({
                        ...prev,
                        [definitionId]: next,
                    }));
                    try {
                        await persistTemplateSelectOptions(definitionId, next);
                    } catch (error) {
                        setTemplateDraftError(
                            normalizeUserFacingError(
                                error,
                                "Failed to update select options.",
                            ),
                        );
                    }
                })();
                return;
            }

            setPendingSelectOptionDelete({
                definitionId,
                optionId,
                optionLabel,
                usageCount,
            });
        },
        [
            editorType,
            metafieldAssignments,
            persistTemplateSelectOptions,
            templateSelectOptionsByDefinitionId,
        ],
    );

    const confirmExistingDefinitionOptionDelete = React.useCallback(async () => {
        if (!pendingSelectOptionDelete) {
            return;
        }

        const { definitionId, optionId } = pendingSelectOptionDelete;
        const current = templateSelectOptionsByDefinitionId[definitionId] ?? [];
        const next = current.filter((option) => option.id !== optionId);

        setTemplateSelectOptionsByDefinitionId((prev) => ({
            ...prev,
            [definitionId]: next,
        }));

        setPendingSelectOptionDelete(null);
        await persistTemplateSelectOptions(definitionId, next);
    }, [
        pendingSelectOptionDelete,
        persistTemplateSelectOptions,
        templateSelectOptionsByDefinitionId,
    ]);

    const cancelExistingDefinitionOptionDelete = React.useCallback(() => {
        if (isSavingTemplate) {
            return;
        }
        setPendingSelectOptionDelete(null);
    }, [isSavingTemplate]);

    const selectIconFromPicker = React.useCallback(
        async (iconKey: string) => {
            if (!iconPickerTarget) {
                return;
            }

            if (iconPickerTarget.kind === "new") {
                updateNewFieldOptionIcon(iconPickerTarget.optionIndex, iconKey);
                return;
            }

            const { definitionId, optionId } = iconPickerTarget;
            const current = templateSelectOptionsByDefinitionId[definitionId] ?? [];
            const next = current.map((option) =>
                option.id === optionId
                    ? {
                          ...option,
                          icon: iconKey,
                      }
                    : option,
            );

            setTemplateSelectOptionsByDefinitionId((prev) => ({
                ...prev,
                [definitionId]: next,
            }));

            await persistTemplateSelectOptions(definitionId, next);
        },
        [
            iconPickerTarget,
            persistTemplateSelectOptions,
            templateSelectOptionsByDefinitionId,
            updateNewFieldOptionIcon,
        ],
    );

    const requestTemplateDraftFieldDelete = React.useCallback(
        (definitionId: string) => {
            setPendingTemplateDeleteDefinitionId(definitionId);
        },
        [],
    );

    const cancelTemplateDraftFieldDelete = React.useCallback(() => {
        if (isSavingTemplate) {
            return;
        }
        setPendingTemplateDeleteDefinitionId(null);
    }, [isSavingTemplate]);

    const confirmTemplateDraftFieldDelete = React.useCallback(() => {
        if (!pendingTemplateDeleteDefinitionId) {
            return;
        }

        removeTemplateDraftField(pendingTemplateDeleteDefinitionId);
        setPendingTemplateDeleteDefinitionId(null);
    }, [pendingTemplateDeleteDefinitionId, removeTemplateDraftField]);

    const handleTemplateSectionDragStart = React.useCallback(
        (event: DragStartEvent) => {
            const activeId = String(event.active.id);
            if (!isTemplateSortableItemId(activeId) || isSavingTemplate) {
                return;
            }

            setTemplateDragPlacementSnapshot(templateSectionPlacement);
            lastProcessedDragOverKeyRef.current = null;

            const modal = dialogModalEditorRef.current;
            if (!modal) {
                templateDragScrollBoundsRef.current = null;
                return;
            }

            templateDragScrollBoundsRef.current = {
                min: 0,
                max: Math.max(0, modal.scrollHeight - modal.clientHeight),
            };
        },
        [isSavingTemplate, isTemplateSortableItemId, templateSectionPlacement],
    );

    const handleTemplateSectionDragMove = React.useCallback(
        (_event: DragMoveEvent) => {
            const modal = dialogModalEditorRef.current;
            const bounds = templateDragScrollBoundsRef.current;
            if (!modal || !bounds) {
                return;
            }

            if (modal.scrollTop < bounds.min) {
                modal.scrollTop = bounds.min;
            } else if (modal.scrollTop > bounds.max) {
                modal.scrollTop = bounds.max;
            }
        },
        [],
    );

    const handleTemplateSectionDragOver = React.useCallback(
        (event: DragOverEvent) => {
            if (isSavingTemplate) {
                return;
            }

            const { active, over } = event;
            if (!over) {
                return;
            }

            const activeId = String(active.id);
            const overId = String(over.id);

            if (!isTemplateSortableItemId(activeId)) {
                return;
            }

            if (!isTemplateSortableItemId(overId)) {
                return;
            }

            pendingDragOverRef.current = { activeId, overId };

            if (dragOverRafRef.current !== null) {
                return;
            }

            dragOverRafRef.current = window.requestAnimationFrame(() => {
                dragOverRafRef.current = null;

                const pending = pendingDragOverRef.current;
                if (!pending) {
                    return;
                }

                pendingDragOverRef.current = null;

                let nextProcessedKey: string | null = null;
                setTemplateSectionPlacement((current) => {
                    const sourceColumn = findTemplateColumnForItem(
                        current,
                        pending.activeId,
                    );
                    const targetColumn = findTemplateColumnForItem(
                        current,
                        pending.overId,
                    );

                    if (
                        !sourceColumn ||
                        !targetColumn ||
                        sourceColumn === targetColumn
                    ) {
                        return current;
                    }

                    if (current[sourceColumn].length <= 1) {
                        return current;
                    }

                    const sourceItems = current[sourceColumn].filter(
                        (id) => id !== pending.activeId,
                    );
                    const targetItems = current[targetColumn].filter(
                        (id) => id !== pending.activeId,
                    );
                    const targetIndex = targetItems.includes(pending.overId)
                        ? targetItems.indexOf(pending.overId)
                        : targetItems.length;

                    if (targetIndex < 0 || targetIndex > targetItems.length) {
                        return current;
                    }

                    const dragOverTransitionKey = `${pending.activeId}->${pending.overId}:${sourceColumn}->${targetColumn}:idx:${targetIndex}`;
                    if (lastProcessedDragOverKeyRef.current === dragOverTransitionKey) {
                        return current;
                    }

                    targetItems.splice(targetIndex, 0, pending.activeId);

                    const nextPlacement = normalizeTemplatePlacement({
                        left:
                            sourceColumn === "left"
                                ? sourceItems
                                : targetColumn === "left"
                                  ? targetItems
                                  : current.left,
                        right:
                            sourceColumn === "right"
                                ? sourceItems
                                : targetColumn === "right"
                                  ? targetItems
                                  : current.right,
                        staticLeftItems,
                        staticRightItems,
                        validFieldItemIds: templateDraftFields.map((field) =>
                            toTemplateCardItemId(field.definitionId),
                        ),
                    });

                    if (areSamePlacement(nextPlacement, current)) {
                        return current;
                    }

                    nextProcessedKey = dragOverTransitionKey;
                    return nextPlacement;
                });

                if (nextProcessedKey) {
                    lastProcessedDragOverKeyRef.current = nextProcessedKey;
                }
            });
        },
        [
            isSavingTemplate,
            isTemplateSortableItemId,
            staticLeftItems,
            staticRightItems,
            templateDraftFields,
        ],
    );

    const handleTemplateSectionDragEnd = React.useCallback(
        (event: DragEndEvent) => {
            if (isSavingTemplate) {
                return;
            }

            const { active, over } = event;
            if (!over) {
                if (templateDragPlacementSnapshot) {
                    setTemplateSectionPlacement(templateDragPlacementSnapshot);
                }
                setTemplateDragPlacementSnapshot(null);
                templateDragScrollBoundsRef.current = null;
                lastProcessedDragOverKeyRef.current = null;
                pendingDragOverRef.current = null;
                if (dragOverRafRef.current !== null) {
                    window.cancelAnimationFrame(dragOverRafRef.current);
                    dragOverRafRef.current = null;
                }
                return;
            }

            const activeId = String(active.id);
            const overId = String(over.id);

            if (activeId === overId) {
                setTemplateDragPlacementSnapshot(null);
                templateDragScrollBoundsRef.current = null;
                lastProcessedDragOverKeyRef.current = null;
                pendingDragOverRef.current = null;
                if (dragOverRafRef.current !== null) {
                    window.cancelAnimationFrame(dragOverRafRef.current);
                    dragOverRafRef.current = null;
                }
                return;
            }

            if (!isTemplateSortableItemId(activeId)) {
                setTemplateDragPlacementSnapshot(null);
                templateDragScrollBoundsRef.current = null;
                lastProcessedDragOverKeyRef.current = null;
                pendingDragOverRef.current = null;
                if (dragOverRafRef.current !== null) {
                    window.cancelAnimationFrame(dragOverRafRef.current);
                    dragOverRafRef.current = null;
                }
                return;
            }

            let nextPlacement: SectionPlacement | null = null;

            setTemplateSectionPlacement((current) => {
                const sourceColumn = findTemplateColumnForItem(current, activeId);
                const targetColumn = findTemplateColumnForItem(current, overId);
                if (!sourceColumn || !targetColumn) {
                    return current;
                }

                if (sourceColumn === targetColumn) {
                    const sourceItems = current[sourceColumn];
                    const oldIndex = sourceItems.indexOf(activeId);
                    if (oldIndex < 0) {
                        return current;
                    }

                    const newIndex = sourceItems.includes(overId)
                        ? sourceItems.indexOf(overId)
                        : sourceItems.length - 1;

                    if (newIndex < 0 || oldIndex === newIndex) {
                        return current;
                    }

                    const reordered = arrayMove(sourceItems, oldIndex, newIndex);
                    const normalized = normalizeTemplatePlacement({
                        left: sourceColumn === "left" ? reordered : current.left,
                        right: sourceColumn === "right" ? reordered : current.right,
                        staticLeftItems,
                        staticRightItems,
                        validFieldItemIds: templateDraftFields.map((field) =>
                            toTemplateCardItemId(field.definitionId),
                        ),
                    });
                    nextPlacement = normalized;
                    return areSamePlacement(normalized, current)
                        ? current
                        : normalized;
                }

                if (current[sourceColumn].length <= 1) {
                    return current;
                }

                const sourceItems = current[sourceColumn].filter((id) => id !== activeId);
                const targetItems = [...current[targetColumn]];
                const targetIndex = targetItems.includes(overId)
                    ? targetItems.indexOf(overId)
                    : targetItems.length;

                if (targetIndex < 0) {
                    targetItems.push(activeId);
                } else {
                    targetItems.splice(targetIndex, 0, activeId);
                }

                const normalized = normalizeTemplatePlacement({
                    left:
                        sourceColumn === "left"
                            ? sourceItems
                            : targetColumn === "left"
                              ? targetItems
                              : current.left,
                    right:
                        sourceColumn === "right"
                            ? sourceItems
                            : targetColumn === "right"
                              ? targetItems
                              : current.right,
                    staticLeftItems,
                    staticRightItems,
                    validFieldItemIds: templateDraftFields.map((field) =>
                        toTemplateCardItemId(field.definitionId),
                    ),
                });
                nextPlacement = normalized;
                return areSamePlacement(normalized, current) ? current : normalized;
            });

            setTemplateDragPlacementSnapshot(null);
            templateDragScrollBoundsRef.current = null;
            lastProcessedDragOverKeyRef.current = null;
            pendingDragOverRef.current = null;
            if (dragOverRafRef.current !== null) {
                window.cancelAnimationFrame(dragOverRafRef.current);
                dragOverRafRef.current = null;
            }

            if (!nextPlacement) {
                return;
            }

            if (!isTemplateCardItemId(activeId)) {
                return;
            }

            const orderedTemplateItemIds = [
                ...nextPlacement.left,
                ...nextPlacement.right,
            ].filter((itemId) => isTemplateCardItemId(itemId));

            const leftSet = new Set(nextPlacement.left);
            setTemplateDraftFields((current) => {
                const byDefinition = new Map(
                    current.map((field) => [field.definitionId, field]),
                );
                return orderedTemplateItemIds
                    .map((itemId) => {
                        const definitionId = toTemplateDefinitionId(itemId);
                        if (!definitionId) {
                            return null;
                        }

                        const existing = byDefinition.get(definitionId);
                        if (!existing) {
                            return null;
                        }

                        return {
                            ...existing,
                            column: leftSet.has(itemId) ? "left" : "right",
                        };
                    })
                    .filter((field): field is TemplateDraftField => Boolean(field));
            });
        },
        [
            isSavingTemplate,
            isTemplateSortableItemId,
            staticLeftItems,
            staticRightItems,
            templateDraftFields,
            templateDragPlacementSnapshot,
        ],
    );

    const handleTemplateSectionDragCancel = React.useCallback(() => {
        if (templateDragPlacementSnapshot) {
            setTemplateSectionPlacement(templateDragPlacementSnapshot);
        }
        setTemplateDragPlacementSnapshot(null);
        templateDragScrollBoundsRef.current = null;
        lastProcessedDragOverKeyRef.current = null;
        pendingDragOverRef.current = null;
        if (dragOverRafRef.current !== null) {
            window.cancelAnimationFrame(dragOverRafRef.current);
            dragOverRafRef.current = null;
        }
    }, [templateDragPlacementSnapshot]);

    React.useEffect(() => {
        return () => {
            if (dragOverRafRef.current !== null) {
                window.cancelAnimationFrame(dragOverRafRef.current);
                dragOverRafRef.current = null;
            }
        };
    }, []);

    const getDefinitionSelectOptionsDraft = React.useCallback(
        (
            definitionId: string,
            definitionSelectOptions?: Array<{
                id: string;
                label: string;
                icon?: string;
                orderIndex?: number;
            }>,
        ): TemplateSelectOptionDraft[] => {
            const localDraft = templateSelectOptionsByDefinitionId[definitionId];
            if (localDraft) {
                return localDraft;
            }

            return sortTemplateSelectOptions(definitionSelectOptions ?? []).map(
                (option) => ({
                    id: option.id,
                    label: option.label,
                    ...(option.icon ? { icon: option.icon } : {}),
                }),
            );
        },
        [templateSelectOptionsByDefinitionId],
    );

    const saveTemplateDraft = React.useCallback(async () => {
        if (!editorType || !projectId) {
            return;
        }

        const normalizedPlacement = normalizeTemplatePlacement({
            left: templateSectionPlacement.left,
            right: templateSectionPlacement.right,
            staticLeftItems,
            staticRightItems,
            validFieldItemIds: templateDraftFields.map((field) =>
                toTemplateCardItemId(field.definitionId),
            ),
        });

        const placementLeft: string[] = [];
        const placementRight: string[] = [];
        const seenPlacementIds = new Set<string>();

        for (const itemId of normalizedPlacement.left) {
            const placementId = staticCardIds.has(itemId)
                ? itemId
                : toTemplateDefinitionId(itemId);
            if (!placementId || seenPlacementIds.has(placementId)) {
                continue;
            }
            seenPlacementIds.add(placementId);
            placementLeft.push(placementId);
        }

        for (const itemId of normalizedPlacement.right) {
            const placementId = staticCardIds.has(itemId)
                ? itemId
                : toTemplateDefinitionId(itemId);
            if (!placementId || seenPlacementIds.has(placementId)) {
                continue;
            }
            seenPlacementIds.add(placementId);
            placementRight.push(placementId);
        }

        const orderedTemplateDefinitionIds = [
            ...placementLeft,
            ...placementRight,
        ]
            .map((placementId) =>
                staticCardIds.has(placementId) ? null : placementId,
            )
            .filter((definitionId): definitionId is string => Boolean(definitionId));

        const dedupedFields: TemplateDraftField[] = [];
        const seenDefinitions = new Set<string>();
        for (const definitionId of orderedTemplateDefinitionIds) {
            const field = templateDraftByDefinitionId.get(definitionId);
            if (!field || seenDefinitions.has(definitionId)) {
                continue;
            }

            seenDefinitions.add(definitionId);
            dedupedFields.push({
                ...field,
                column: normalizedPlacement.left.includes(
                    toTemplateCardItemId(definitionId),
                )
                    ? "left"
                    : "right",
            });
        }

        setIsSavingTemplate(true);
        setTemplateDraftError(null);

        try {
            const selectFields = dedupedFields.filter(
                (field) => field.kind === "select",
            );
            for (const field of selectFields) {
                await persistTemplateSelectOptions(field.definitionId);
            }

            await saveEditorTemplate({
                projectId,
                editorType,
                placement: {
                    left: placementLeft,
                    right: placementRight,
                },
                fields: dedupedFields.map((field) => ({
                    definitionId: field.definitionId,
                    kind: field.kind,
                })),
            });

            await reloadProjectTemplateData(projectId);
            setPendingTemplateDeleteDefinitionId(null);
            onOpenChange(false);
        } catch (error) {
            setTemplateDraftError(
                normalizeUserFacingError(error, "Failed to save editor template."),
            );
        } finally {
            setIsSavingTemplate(false);
        }
    }, [
        editorType,
        onOpenChange,
        projectId,
        reloadProjectTemplateData,
        saveEditorTemplate,
        persistTemplateSelectOptions,
        staticCardIds,
        staticLeftItems,
        staticRightItems,
        templateDraftByDefinitionId,
        templateDraftFields,
        templateSectionPlacement.left,
        templateSectionPlacement.right,
    ]);

    const iconPickerSelectedIconKey = React.useMemo(() => {
        if (!iconPickerTarget) {
            return undefined;
        }

        if (iconPickerTarget.kind === "new") {
            return templateNewFieldOptionsDraft[iconPickerTarget.optionIndex]?.icon;
        }

        const options =
            templateSelectOptionsByDefinitionId[iconPickerTarget.definitionId] ?? [];
        return options.find((option) => option.id === iconPickerTarget.optionId)
            ?.icon;
    }, [
        iconPickerTarget,
        templateNewFieldOptionsDraft,
        templateSelectOptionsByDefinitionId,
    ]);

    const currentTemplateDraftSignature = React.useMemo(
        () =>
            buildTemplateDraftSignature({
                fields: templateDraftFields,
                placement: templateSectionPlacement,
                selectOptionsByDefinitionId: templateSelectOptionsByDefinitionId,
                templateNewFieldName,
                templateNewFieldKind,
                templateNewFieldOptionsDraft,
            }),
        [
            templateDraftFields,
            templateSectionPlacement,
            templateSelectOptionsByDefinitionId,
            templateNewFieldKind,
            templateNewFieldName,
            templateNewFieldOptionsDraft,
        ],
    );

    const hasUnsavedTemplateChanges = React.useMemo(() => {
        const initialSignature = initialTemplateDraftSignatureRef.current;
        if (!open || !initialSignature) {
            return false;
        }

        return initialSignature !== currentTemplateDraftSignature;
    }, [currentTemplateDraftSignature, open]);

    React.useEffect(() => {
        if (!open) {
            setPendingUnsavedCloseConfirm(false);
            initialTemplateDraftSignatureRef.current = null;
        }
    }, [open]);

    const requestTemplateDialogClose = React.useCallback(() => {
        if (isSavingTemplate) {
            return;
        }

        if (hasUnsavedTemplateChanges) {
            setPendingUnsavedCloseConfirm(true);
            return;
        }

        onOpenChange(false);
    }, [hasUnsavedTemplateChanges, isSavingTemplate, onOpenChange]);

    const cancelUnsavedTemplateClose = React.useCallback(() => {
        if (isSavingTemplate) {
            return;
        }

        setPendingUnsavedCloseConfirm(false);
    }, [isSavingTemplate]);

    const confirmUnsavedTemplateClose = React.useCallback(() => {
        if (isSavingTemplate) {
            return;
        }

        setPendingUnsavedCloseConfirm(false);
        onOpenChange(false);
    }, [isSavingTemplate, onOpenChange]);

    if (!editorType) {
        return null;
    }

    return (
        <>
            <Dialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                        onOpenChange(true);
                        return;
                    }

                    requestTemplateDialogClose();
                }}
            >
            <DialogModalEditorContent ref={dialogModalEditorRef}>
                <DialogHeader>
                    <DialogTitle>
                        Edit {editorTypeLabel(editorType)} Template
                    </DialogTitle>
                    <DialogDescription>
                        Arrange core cards and metafields to define the default
                        editor layout.
                    </DialogDescription>
                </DialogHeader>
                <div className="dialog-form">
                    <div className="dialog-field">
                        <Label>Create New Metafield</Label>
                        <div className="flex-row">
                            <Input
                                value={templateNewFieldName}
                                onChange={(event) =>
                                    setTemplateNewFieldName(event.target.value)
                                }
                                placeholder="Metafield name"
                                disabled={isSavingTemplate}
                            />
                            <select
                                className="input template-new-field-kind-select"
                                value={templateNewFieldKind}
                                onChange={(event) =>
                                    setTemplateNewFieldKind(
                                        event.target.value as
                                            | "field"
                                            | "paragraph"
                                            | "select",
                                    )
                                }
                                disabled={isSavingTemplate}
                            >
                                <option value="field">Field</option>
                                <option value="paragraph">Paragraph</option>
                                <option value="select">Select</option>
                            </select>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    void createAndAddTemplateField();
                                }}
                                disabled={isSavingTemplate || !templateNewFieldName.trim()}
                            >
                                Create
                            </Button>
                        </div>
                    </div>
                    {templateDraftError ? (
                        <span className="card-hint is-error">
                            {templateDraftError}
                        </span>
                    ) : null}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        autoScroll={!isSavingTemplate}
                        onDragStart={handleTemplateSectionDragStart}
                        onDragMove={handleTemplateSectionDragMove}
                        onDragOver={handleTemplateSectionDragOver}
                        onDragEnd={handleTemplateSectionDragEnd}
                        onDragCancel={handleTemplateSectionDragCancel}
                    >
                        <div className="entity-editor-grid entity-editor-grid--balanced">
                            <div className="entity-column-shell entity-column-shell--lhs">
                                <div
                                    className="entity-column-dropzone"
                                >
                                    <SortableContext
                                        items={templateSectionPlacement.left}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="entity-column entity-column--sortable">
                                            {templateSectionPlacement.left.map(
                                                (itemId) => {
                                                    if (
                                                        staticCardById.has(itemId)
                                                    ) {
                                                        const staticCard =
                                                            staticCardById.get(itemId);
                                                        const staticPlaceholder =
                                                            renderStaticTemplateCardPlaceholder(
                                                                itemId,
                                                            );
                                                        return (
                                                            <SortableSectionCard
                                                                key={itemId}
                                                                id={itemId}
                                                                title={
                                                                    staticCard?.title ??
                                                                    "Core Card"
                                                                }
                                                                className={`is-static${
                                                                    staticPlaceholder
                                                                        ? ""
                                                                        : " is-static-empty"
                                                                }`}
                                                                disableDrag={isSavingTemplate}
                                                                showDragHandle={!isSavingTemplate}
                                                            >
                                                                {staticPlaceholder}
                                                            </SortableSectionCard>
                                                        );
                                                    }

                                                    const definitionId =
                                                        toTemplateDefinitionId(
                                                            itemId,
                                                        );
                                                    if (!definitionId) {
                                                        return null;
                                                    }
                                                    const field =
                                                        templateDraftByDefinitionId.get(
                                                            definitionId,
                                                        );
                                                    const definition =
                                                        templateDefinitionById.get(
                                                            definitionId,
                                                        );
                                                    if (!field || !definition) {
                                                        return null;
                                                    }

                                                    return (
                                                        <SortableSectionCard
                                                            key={itemId}
                                                            id={itemId}
                                                            title={definition.name}
                                                            className={
                                                                field.kind === "field"
                                                                    ? "entity-section-card--half"
                                                                    : "entity-section-card--full"
                                                            }
                                                            headerActions={
                                                                <button
                                                                    type="button"
                                                                    className="entity-section-card-icon-btn entity-section-card-icon-btn--danger"
                                                                    aria-label={`Delete ${definition.name} from template`}
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        event.stopPropagation();
                                                                        requestTemplateDraftFieldDelete(
                                                                            definitionId,
                                                                        );
                                                                    }}
                                                                    disabled={isSavingTemplate}
                                                                >
                                                                    <TrashIcon size={14} />
                                                                </button>
                                                            }
                                                            disableDrag={isSavingTemplate}
                                                            showDragHandle={!isSavingTemplate}
                                                        >
                                                            {renderTemplateKindPlaceholder(
                                                                field.kind,
                                                            )}
                                                            {field.kind ===
                                                            "select" ? (
                                                                <TemplateSelectOptionsEditor
                                                                    options={getDefinitionSelectOptionsDraft(
                                                                        definitionId,
                                                                        definition.selectOptions as Array<{
                                                                            id: string;
                                                                            label: string;
                                                                            icon?: string;
                                                                            orderIndex?: number;
                                                                        }>,
                                                                    )}
                                                                    disabled={
                                                                        isSavingTemplate
                                                                    }
                                                                    onAddOption={
                                                                        (label) => {
                                                                            void addExistingDefinitionOption(
                                                                                definitionId,
                                                                                label,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionLabelChange={
                                                                        (
                                                                            option,
                                                                            label,
                                                                        ) => {
                                                                            if (
                                                                                !option.id
                                                                            ) {
                                                                                return;
                                                                            }
                                                                            updateExistingDefinitionOptionLabel(
                                                                                definitionId,
                                                                                option.id,
                                                                                label,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionLabelBlur={
                                                                        () => {
                                                                            void blurExistingDefinitionOptionLabel(
                                                                                definitionId,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionDelete={
                                                                        (
                                                                            option,
                                                                        ) => {
                                                                            if (
                                                                                !option.id
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            requestExistingDefinitionOptionDelete(
                                                                                definitionId,
                                                                                option.id,
                                                                                option.label,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionIconEdit={
                                                                        (
                                                                            option,
                                                                        ) => {
                                                                            if (
                                                                                !option.id
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            setIconPickerTarget(
                                                                                {
                                                                                    kind: "existing",
                                                                                    definitionId,
                                                                                    optionId: option.id,
                                                                                },
                                                                            );
                                                                        }
                                                                    }
                                                                />
                                                            ) : null}
                                                        </SortableSectionCard>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </SortableContext>
                                </div>
                            </div>
                            <div className="entity-column-shell entity-column-shell--rhs">
                                <div
                                    className="entity-column-dropzone"
                                >
                                    <SortableContext
                                        items={templateSectionPlacement.right}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="entity-column entity-column--sortable">
                                            {templateSectionPlacement.right.map(
                                                (itemId) => {
                                                    if (
                                                        staticCardById.has(itemId)
                                                    ) {
                                                        const staticCard =
                                                            staticCardById.get(itemId);
                                                        const staticPlaceholder =
                                                            renderStaticTemplateCardPlaceholder(
                                                                itemId,
                                                            );
                                                        return (
                                                            <SortableSectionCard
                                                                key={itemId}
                                                                id={itemId}
                                                                title={
                                                                    staticCard?.title ??
                                                                    "Core Card"
                                                                }
                                                                className={`is-static${
                                                                    staticPlaceholder
                                                                        ? ""
                                                                        : " is-static-empty"
                                                                }`}
                                                                disableDrag={isSavingTemplate}
                                                                showDragHandle={!isSavingTemplate}
                                                            >
                                                                {staticPlaceholder}
                                                            </SortableSectionCard>
                                                        );
                                                    }

                                                    const definitionId =
                                                        toTemplateDefinitionId(
                                                            itemId,
                                                        );
                                                    if (!definitionId) {
                                                        return null;
                                                    }
                                                    const field =
                                                        templateDraftByDefinitionId.get(
                                                            definitionId,
                                                        );
                                                    const definition =
                                                        templateDefinitionById.get(
                                                            definitionId,
                                                        );
                                                    if (!field || !definition) {
                                                        return null;
                                                    }

                                                    return (
                                                        <SortableSectionCard
                                                            key={itemId}
                                                            id={itemId}
                                                            title={definition.name}
                                                            className={
                                                                field.kind === "field"
                                                                    ? "entity-section-card--half"
                                                                    : "entity-section-card--full"
                                                            }
                                                            headerActions={
                                                                <button
                                                                    type="button"
                                                                    className="entity-section-card-icon-btn entity-section-card-icon-btn--danger"
                                                                    aria-label={`Delete ${definition.name} from template`}
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        event.stopPropagation();
                                                                        requestTemplateDraftFieldDelete(
                                                                            definitionId,
                                                                        );
                                                                    }}
                                                                    disabled={isSavingTemplate}
                                                                >
                                                                    <TrashIcon size={14} />
                                                                </button>
                                                            }
                                                            disableDrag={isSavingTemplate}
                                                            showDragHandle={!isSavingTemplate}
                                                        >
                                                            {renderTemplateKindPlaceholder(
                                                                field.kind,
                                                            )}
                                                            {field.kind ===
                                                            "select" ? (
                                                                <TemplateSelectOptionsEditor
                                                                    options={getDefinitionSelectOptionsDraft(
                                                                        definitionId,
                                                                        definition.selectOptions as Array<{
                                                                            id: string;
                                                                            label: string;
                                                                            icon?: string;
                                                                            orderIndex?: number;
                                                                        }>,
                                                                    )}
                                                                    disabled={
                                                                        isSavingTemplate
                                                                    }
                                                                    onAddOption={
                                                                        (label) => {
                                                                            void addExistingDefinitionOption(
                                                                                definitionId,
                                                                                label,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionLabelChange={
                                                                        (
                                                                            option,
                                                                            label,
                                                                        ) => {
                                                                            if (
                                                                                !option.id
                                                                            ) {
                                                                                return;
                                                                            }
                                                                            updateExistingDefinitionOptionLabel(
                                                                                definitionId,
                                                                                option.id,
                                                                                label,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionLabelBlur={
                                                                        () => {
                                                                            void blurExistingDefinitionOptionLabel(
                                                                                definitionId,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionDelete={
                                                                        (
                                                                            option,
                                                                        ) => {
                                                                            if (
                                                                                !option.id
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            requestExistingDefinitionOptionDelete(
                                                                                definitionId,
                                                                                option.id,
                                                                                option.label,
                                                                            );
                                                                        }
                                                                    }
                                                                    onOptionIconEdit={
                                                                        (
                                                                            option,
                                                                        ) => {
                                                                            if (
                                                                                !option.id
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            setIconPickerTarget(
                                                                                {
                                                                                    kind: "existing",
                                                                                    definitionId,
                                                                                    optionId: option.id,
                                                                                },
                                                                            );
                                                                        }
                                                                    }
                                                                />
                                                            ) : null}
                                                        </SortableSectionCard>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </SortableContext>
                                </div>
                            </div>
                        </div>
                    </DndContext>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={requestTemplateDialogClose}
                            disabled={isSavingTemplate}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                void saveTemplateDraft();
                            }}
                            disabled={isSavingTemplate}
                        >
                            {isSavingTemplate ? "Saving..." : "Save template"}
                        </Button>
                    </div>
                </div>
            </DialogModalEditorContent>
            </Dialog>
            <Dialog
                open={pendingUnsavedCloseConfirm}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        cancelUnsavedTemplateClose();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Discard Unsaved Changes?</DialogTitle>
                        <DialogDescription>
                            You have unsaved template edits. Closing now will
                            discard them.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={cancelUnsavedTemplateClose}
                            disabled={isSavingTemplate}
                        >
                            Keep Editing
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={confirmUnsavedTemplateClose}
                            disabled={isSavingTemplate}
                        >
                            Discard Changes
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(pendingTemplateDeleteDefinitionId)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        cancelTemplateDraftFieldDelete();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Heads up!</DialogTitle>
                        <DialogDescription>
                            Heads up! Deleting this metafield will affect ALL existing items using this template. Any existing information will be discarded.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={cancelTemplateDraftFieldDelete}
                            disabled={isSavingTemplate}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={confirmTemplateDraftFieldDelete}
                            disabled={isSavingTemplate}
                        >
                            Delete Metafield
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog
                open={Boolean(pendingSelectOptionDelete)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        cancelExistingDefinitionOptionDelete();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Option?</DialogTitle>
                        <DialogDescription>
                            This option is used in {pendingSelectOptionDelete?.usageCount ?? 0}{" "}
                            saved value{(pendingSelectOptionDelete?.usageCount ?? 0) === 1 ? "" : "s"}.
                            Deleting it will remove it from those assignments.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={cancelExistingDefinitionOptionDelete}
                            disabled={isSavingTemplate}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                void confirmExistingDefinitionOptionDelete();
                            }}
                            disabled={isSavingTemplate}
                        >
                            Delete Option
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            <SelectOptionIconPickerDialog
                open={Boolean(iconPickerTarget)}
                selectedIconKey={iconPickerSelectedIconKey}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) {
                        setIconPickerTarget(null);
                    }
                }}
                onSelect={(iconKey) => {
                    void selectIconFromPicker(iconKey);
                }}
            />
        </>
    );
};
