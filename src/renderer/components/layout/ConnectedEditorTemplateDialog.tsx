import React from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useAppStore } from "../../state/appStore";
import type { WorkspaceEditorTemplateType } from "../../types";
import { Button } from "../ui/Button";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogModalEditorContent,
    DialogTitle,
} from "../ui/Dialog";
import { GripVerticalIcon } from "../ui/Icons";
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

const TEMPLATE_CORE_LEFT_ITEMS = ["template-core:description"] as const;
const TEMPLATE_CORE_RIGHT_ITEMS = [
    "template-core:portrait",
    "template-core:audio",
] as const;
const TEMPLATE_CORE_ITEM_IDS = new Set<string>([
    ...TEMPLATE_CORE_LEFT_ITEMS,
    ...TEMPLATE_CORE_RIGHT_ITEMS,
]);

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
    if (itemId === "template-column-left") {
        return "left";
    }
    if (itemId === "template-column-right") {
        return "right";
    }
    return null;
};

const defaultKindForDefinition = (
    valueType: "string" | "string[]" | "entity" | "entity[]" | "image" | "image[]",
): "field" | "paragraph" | "select" =>
    valueType === "string[]" ? "select" : "field";

const editorTypeLabel = (editorType: WorkspaceEditorTemplateType): string => {
    if (editorType === "character") {
        return "Character";
    }
    if (editorType === "location") {
        return "Location";
    }
    return "Organization";
};

type SortableSectionCardProps = {
    id: string;
    title: string;
    children: React.ReactNode;
    className?: string;
    disableDrag?: boolean;
    showDragHandle?: boolean;
    isActiveDrag?: boolean;
    dragDimensions?: { width: number; height: number } | null;
};

const SortableSectionCard: React.FC<SortableSectionCardProps> = ({
    id,
    title,
    children,
    className,
    disableDrag = false,
    showDragHandle = true,
    isActiveDrag = false,
    dragDimensions = null,
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
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isDragging && isActiveDrag && dragDimensions
            ? {
                  width: dragDimensions.width,
                  height: dragDimensions.height,
              }
            : {}),
    };

    return (
        <section
            ref={setNodeRef}
            style={style}
            className={`entity-section-card${className ? ` ${className}` : ""}${isDragging ? " is-dragging" : ""}`}
        >
            <div className="entity-section-card-header">
                <p className="panel-label">{title}</p>
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
    const [templateFieldToAdd, setTemplateFieldToAdd] = React.useState("");
    const [templateNewFieldName, setTemplateNewFieldName] = React.useState("");
    const [templateNewFieldKind, setTemplateNewFieldKind] = React.useState<
        "field" | "paragraph" | "select"
    >("field");
    const [templateDraftFields, setTemplateDraftFields] = React.useState<
        TemplateDraftField[]
    >([]);
    const [templateSectionPlacement, setTemplateSectionPlacement] =
        React.useState<SectionPlacement>({
            left: [...TEMPLATE_CORE_LEFT_ITEMS],
            right: [...TEMPLATE_CORE_RIGHT_ITEMS],
        });
    const [activeTemplateDragId, setActiveTemplateDragId] = React.useState<
        string | null
    >(null);
    const [templateDragPreviewDimensions, setTemplateDragPreviewDimensions] =
        React.useState<{ width: number; height: number } | null>(null);

    const sensors = useSensors(useSensor(PointerSensor));

    const leftDroppable = useDroppable({
        id: "template-column-left",
    });
    const rightDroppable = useDroppable({
        id: "template-column-right",
    });

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

        return metafieldDefinitions.filter((definition) => {
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
    }, [editorType, metafieldDefinitions]);

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

    React.useEffect(() => {
        if (!open || !editorType) {
            return;
        }

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

        const nextLeft = [
            ...TEMPLATE_CORE_LEFT_ITEMS,
            ...nextDraftFields
                .filter((field) => field.column === "left")
                .map((field) => toTemplateCardItemId(field.definitionId)),
        ];
        const nextRight = [
            ...TEMPLATE_CORE_RIGHT_ITEMS,
            ...nextDraftFields
                .filter((field) => field.column === "right")
                .map((field) => toTemplateCardItemId(field.definitionId)),
        ];

        setTemplateDraftFields(nextDraftFields);
        setTemplateSectionPlacement({ left: nextLeft, right: nextRight });
        setTemplateFieldToAdd("");
        setTemplateNewFieldName("");
        setTemplateNewFieldKind("field");
        setTemplateDraftError(null);
        setActiveTemplateDragId(null);
        setTemplateDragPreviewDimensions(null);
    }, [open, editorType, template, templateDefinitionById]);

    React.useEffect(() => {
        if (!open) {
            return;
        }

        const templateFieldIds = templateDraftFields.map((field) =>
            toTemplateCardItemId(field.definitionId),
        );

        setTemplateSectionPlacement((current) => {
            const filteredLeft = current.left.filter(
                (itemId) =>
                    TEMPLATE_CORE_ITEM_IDS.has(itemId) ||
                    templateFieldIds.includes(itemId),
            );
            const filteredRight = current.right.filter(
                (itemId) =>
                    TEMPLATE_CORE_ITEM_IDS.has(itemId) ||
                    templateFieldIds.includes(itemId),
            );

            const present = new Set([...filteredLeft, ...filteredRight]);
            const missing = templateFieldIds.filter(
                (itemId) => !present.has(itemId),
            );

            if (missing.length === 0) {
                return current;
            }

            return {
                left: [...filteredLeft, ...missing],
                right: filteredRight,
            };
        });
    }, [open, templateDraftFields]);

    const addTemplateField = React.useCallback(() => {
        const definitionId = templateFieldToAdd.trim();
        if (!definitionId) {
            setTemplateDraftError("Choose a metafield to add.");
            return;
        }

        if (templateDraftFields.some((field) => field.definitionId === definitionId)) {
            setTemplateDraftError("This metafield is already in the template.");
            return;
        }

        const definition = templateDefinitionById.get(definitionId);
        if (!definition) {
            setTemplateDraftError("Selected metafield is no longer available.");
            return;
        }

        setTemplateDraftFields((current) => [
            ...current,
            {
                definitionId,
                kind: defaultKindForDefinition(definition.valueType),
                column: "left",
            },
        ]);
        setTemplateSectionPlacement((current) => ({
            left: [...current.left, toTemplateCardItemId(definitionId)],
            right: current.right,
        }));
        setTemplateFieldToAdd("");
        setTemplateDraftError(null);
    }, [templateDefinitionById, templateDraftFields, templateFieldToAdd]);

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

    const updateTemplateDraftField = React.useCallback(
        (
            definitionId: string,
            patch: Partial<Pick<TemplateDraftField, "kind" | "column">>,
        ) => {
            setTemplateDraftFields((current) =>
                current.map((field) =>
                    field.definitionId === definitionId
                        ? {
                              ...field,
                              ...patch,
                          }
                        : field,
                ),
            );
            if (templateDraftError) {
                setTemplateDraftError(null);
            }
        },
        [templateDraftError],
    );

    const handleTemplateSectionDragStart = React.useCallback(
        (event: DragStartEvent) => {
            const activeId = String(event.active.id);
            if (!isTemplateCardItemId(activeId) || isSavingTemplate) {
                return;
            }

            setActiveTemplateDragId(activeId);

            const initialRect = event.active.rect.current.initial;
            if (initialRect && initialRect.width > 0 && initialRect.height > 0) {
                setTemplateDragPreviewDimensions({
                    width: initialRect.width,
                    height: initialRect.height,
                });
                return;
            }

            setTemplateDragPreviewDimensions(null);
        },
        [isSavingTemplate],
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

            if (!isTemplateCardItemId(activeId) || !isTemplateCardItemId(overId)) {
                return;
            }

            setTemplateSectionPlacement((current) => {
                const sourceColumn = findTemplateColumnForItem(current, activeId);
                const targetColumn = findTemplateColumnForItem(current, overId);

                if (!sourceColumn || !targetColumn || sourceColumn === targetColumn) {
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

                return {
                    ...current,
                    [sourceColumn]: sourceItems,
                    [targetColumn]: targetItems,
                };
            });
        },
        [isSavingTemplate],
    );

    const handleTemplateSectionDragEnd = React.useCallback(
        (event: DragEndEvent) => {
            setActiveTemplateDragId(null);
            setTemplateDragPreviewDimensions(null);

            if (isSavingTemplate) {
                return;
            }

            const { active, over } = event;
            if (!over) {
                return;
            }

            const activeId = String(active.id);
            const overId = String(over.id);

            if (!isTemplateCardItemId(activeId)) {
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
                    nextPlacement = {
                        ...current,
                        [sourceColumn]: reordered,
                    };
                    return nextPlacement;
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

                nextPlacement = {
                    ...current,
                    [sourceColumn]: sourceItems,
                    [targetColumn]: targetItems,
                };
                return nextPlacement;
            });

            if (!nextPlacement) {
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
        [isSavingTemplate],
    );

    const handleTemplateSectionDragCancel = React.useCallback(() => {
        setActiveTemplateDragId(null);
        setTemplateDragPreviewDimensions(null);
    }, []);

    const saveTemplateDraft = React.useCallback(async () => {
        if (!editorType || !projectId) {
            return;
        }

        const orderedTemplateDefinitionIds = [
            ...templateSectionPlacement.left,
            ...templateSectionPlacement.right,
        ]
            .map((itemId) => toTemplateDefinitionId(itemId))
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
                column: templateSectionPlacement.left.includes(
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
                    left: dedupedFields
                        .filter((field) => field.column === "left")
                        .map((field) => field.definitionId),
                    right: dedupedFields
                        .filter((field) => field.column === "right")
                        .map((field) => field.definitionId),
                },
                fields: dedupedFields.map((field) => ({
                    definitionId: field.definitionId,
                    kind: field.kind,
                })),
            });

            await reloadProjectTemplateData(projectId);
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
        templateDraftByDefinitionId,
        templateSectionPlacement.left,
        templateSectionPlacement.right,
    ]);

    if (!editorType) {
        return null;
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (isSavingTemplate && !nextOpen) {
                    return;
                }
                onOpenChange(nextOpen);
            }}
        >
            <DialogModalEditorContent>
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
                        <Label>Add Existing Metafield</Label>
                        <div className="flex-row">
                            <select
                                className="input"
                                value={templateFieldToAdd}
                                onChange={(event) =>
                                    setTemplateFieldToAdd(event.target.value)
                                }
                                disabled={isSavingTemplate}
                            >
                                <option value="">Select metafield</option>
                                {templateDefinitionOptions
                                    .filter(
                                        (definition) =>
                                            !templateDraftFields.some(
                                                (field) =>
                                                    field.definitionId ===
                                                    definition.id,
                                            ),
                                    )
                                    .map((definition) => (
                                        <option
                                            key={definition.id}
                                            value={definition.id}
                                        >
                                            {definition.name}
                                        </option>
                                    ))}
                            </select>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={addTemplateField}
                                disabled={isSavingTemplate || !templateFieldToAdd}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
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
                        onDragStart={handleTemplateSectionDragStart}
                        onDragOver={handleTemplateSectionDragOver}
                        onDragEnd={handleTemplateSectionDragEnd}
                        onDragCancel={handleTemplateSectionDragCancel}
                    >
                        <div className="entity-editor-grid entity-editor-grid--balanced">
                            <div className="entity-column-shell entity-column-shell--lhs">
                                <div
                                    className="entity-column-dropzone"
                                    ref={leftDroppable.setNodeRef}
                                >
                                    <SortableContext
                                        items={templateSectionPlacement.left}
                                        strategy={rectSortingStrategy}
                                    >
                                        <div className="entity-column entity-column--sortable">
                                            {templateSectionPlacement.left.map(
                                                (itemId) => {
                                                    if (
                                                        itemId ===
                                                        "template-core:description"
                                                    ) {
                                                        return (
                                                            <SortableSectionCard
                                                                key={itemId}
                                                                id={itemId}
                                                                title="Description"
                                                                className="is-static"
                                                                disableDrag
                                                                showDragHandle={false}
                                                            >
                                                                <div className="entity-metafield-pending">
                                                                    Core card preview
                                                                </div>
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
                                                            disableDrag={isSavingTemplate}
                                                            showDragHandle={!isSavingTemplate}
                                                            isActiveDrag={
                                                                activeTemplateDragId ===
                                                                itemId
                                                            }
                                                            dragDimensions={
                                                                templateDragPreviewDimensions
                                                            }
                                                        >
                                                            <div className="metafield-create-grid">
                                                                <select
                                                                    className="input"
                                                                    value={field.kind}
                                                                    onChange={(event) =>
                                                                        updateTemplateDraftField(
                                                                            definitionId,
                                                                            {
                                                                                kind: event
                                                                                    .target
                                                                                    .value as TemplateDraftField["kind"],
                                                                            },
                                                                        )
                                                                    }
                                                                    disabled={isSavingTemplate}
                                                                >
                                                                    <option value="field">
                                                                        Field
                                                                    </option>
                                                                    <option value="paragraph">
                                                                        Paragraph
                                                                    </option>
                                                                    <option value="select">
                                                                        Select
                                                                    </option>
                                                                </select>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        removeTemplateDraftField(
                                                                            definitionId,
                                                                        )
                                                                    }
                                                                    disabled={isSavingTemplate}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
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
                                    ref={rightDroppable.setNodeRef}
                                >
                                    <SortableContext
                                        items={templateSectionPlacement.right}
                                        strategy={rectSortingStrategy}
                                    >
                                        <div className="entity-column entity-column--sortable">
                                            {templateSectionPlacement.right.map(
                                                (itemId) => {
                                                    if (
                                                        itemId ===
                                                        "template-core:portrait"
                                                    ) {
                                                        return (
                                                            <SortableSectionCard
                                                                key={itemId}
                                                                id={itemId}
                                                                title="Portrait"
                                                                className="is-static"
                                                                disableDrag
                                                                showDragHandle={false}
                                                            >
                                                                <div className="entity-metafield-pending">
                                                                    Core card preview
                                                                </div>
                                                            </SortableSectionCard>
                                                        );
                                                    }

                                                    if (
                                                        itemId ===
                                                        "template-core:audio"
                                                    ) {
                                                        return (
                                                            <SortableSectionCard
                                                                key={itemId}
                                                                id={itemId}
                                                                title="Audio Assets"
                                                                className="is-static"
                                                                disableDrag
                                                                showDragHandle={false}
                                                            >
                                                                <div className="entity-metafield-pending">
                                                                    Core card preview
                                                                </div>
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
                                                            disableDrag={isSavingTemplate}
                                                            showDragHandle={!isSavingTemplate}
                                                            isActiveDrag={
                                                                activeTemplateDragId ===
                                                                itemId
                                                            }
                                                            dragDimensions={
                                                                templateDragPreviewDimensions
                                                            }
                                                        >
                                                            <div className="metafield-create-grid">
                                                                <select
                                                                    className="input"
                                                                    value={field.kind}
                                                                    onChange={(event) =>
                                                                        updateTemplateDraftField(
                                                                            definitionId,
                                                                            {
                                                                                kind: event
                                                                                    .target
                                                                                    .value as TemplateDraftField["kind"],
                                                                            },
                                                                        )
                                                                    }
                                                                    disabled={isSavingTemplate}
                                                                >
                                                                    <option value="field">
                                                                        Field
                                                                    </option>
                                                                    <option value="paragraph">
                                                                        Paragraph
                                                                    </option>
                                                                    <option value="select">
                                                                        Select
                                                                    </option>
                                                                </select>
                                                                <Button
                                                                    type="button"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() =>
                                                                        removeTemplateDraftField(
                                                                            definitionId,
                                                                        )
                                                                    }
                                                                    disabled={isSavingTemplate}
                                                                >
                                                                    Remove
                                                                </Button>
                                                            </div>
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
    );
};
