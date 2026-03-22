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
import { GripVerticalIcon, TrashIcon } from "../ui/Icons";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { normalizeUserFacingError } from "../../utils/userFacingError";

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

export const ConnectedEditorTemplateDialog: React.FC<EditorTemplateDialogProps> = ({
    open,
    editorType,
    onOpenChange,
}) => {
    const {
        projectId,
        editorTemplates,
        metafieldDefinitions,
        createOrReuseMetafieldDefinition,
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
            }
        >
    >(new Map());
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
        setTemplateDraftError(null);
        setPendingTemplateDeleteDefinitionId(null);
        setTemplateDragPlacementSnapshot(null);
        lastProcessedDragOverKeyRef.current = null;
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
        setTemplateDraftError(null);
    }, []);

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
        staticCardIds,
        staticLeftItems,
        staticRightItems,
        templateDraftByDefinitionId,
        templateDraftFields,
        templateSectionPlacement.left,
        templateSectionPlacement.right,
    ]);

    if (!editorType) {
        return null;
    }

    return (
        <>
            <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (isSavingTemplate && !nextOpen) {
                    return;
                }
                onOpenChange(nextOpen);
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
                                className="input"
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
                                Create & Add
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
                                                        return (
                                                            <SortableSectionCard
                                                                key={itemId}
                                                                id={itemId}
                                                                title={
                                                                    staticCard?.title ??
                                                                    "Core Card"
                                                                }
                                                                className="is-static"
                                                                disableDrag={isSavingTemplate}
                                                                showDragHandle={!isSavingTemplate}
                                                            >
                                                                {renderStaticTemplateCardPlaceholder(
                                                                    itemId,
                                                                )}
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
                                                        return (
                                                            <SortableSectionCard
                                                                key={itemId}
                                                                id={itemId}
                                                                title={
                                                                    staticCard?.title ??
                                                                    "Core Card"
                                                                }
                                                                className="is-static"
                                                                disableDrag={isSavingTemplate}
                                                                showDragHandle={!isSavingTemplate}
                                                            >
                                                                {renderStaticTemplateCardPlaceholder(
                                                                    itemId,
                                                                )}
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
                            onClick={() => onOpenChange(false)}
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
        </>
    );
};
