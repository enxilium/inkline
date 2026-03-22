import React from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {
    WorkspaceMetafieldAssignment,
    WorkspaceMetafieldDefinition,
} from "../../types";
import type { DocumentRef } from "../ui/ListInput";
import { Input } from "../ui/Input";
import { TraitsInput } from "../ui/TraitsInput";
import { Button } from "../ui/Button";
import { ParagraphRichField } from "./ParagraphRichField";

type EditorEntityType = "character" | "location" | "organization";
type MetafieldUiKind = "field" | "paragraph" | "select";

type MetafieldUiValue =
    | { kind: "field"; value: string }
    | { kind: "paragraph"; value: string }
    | { kind: "select"; value: string[] };

type Props = {
    projectId: string;
    entityType: EditorEntityType;
    entityId: string;
    definitions: WorkspaceMetafieldDefinition[];
    assignments: WorkspaceMetafieldAssignment[];
    characterOptions: Array<{ id: string; label: string }>;
    locationOptions: Array<{ id: string; label: string }>;
    organizationOptions: Array<{ id: string; label: string }>;
    imageOptions: Array<{ id: string; label: string }>;
    availableDocuments?: DocumentRef[];
    onNavigateToDocument?: (ref: DocumentRef) => void;
    onCreateOrReuseDefinition: (request: {
        projectId: string;
        name: string;
        scope: "character" | "location" | "organization" | "project";
        valueType:
            | "string"
            | "string[]"
            | "entity"
            | "entity[]"
            | "image"
            | "image[]";
        targetEntityKind?: "character" | "location" | "organization";
        selectOptions?: Array<
            | string
            | {
                  label: string;
                  icon?: string | null;
              }
        >;
    }) => Promise<{ definition: WorkspaceMetafieldDefinition }>;
    onSaveDefinitionSelectOptions: (request: {
        definitionId: string;
        options: Array<{ id?: string; label: string; icon?: string | null }>;
    }) => Promise<{
        definitionId: string;
        options: Array<{ id: string; label: string; icon?: string }>;
    }>;
    onAssignDefinition: (request: {
        definitionId: string;
        entityType: EditorEntityType;
        entityId: string;
    }) => Promise<{ assignment: WorkspaceMetafieldAssignment }>;
    onSaveValue: (request: {
        assignmentId: string;
        value?: unknown;
        orderIndex?: number;
    }) => Promise<void>;
    onUnassign: (request: {
        definitionId: string;
        entityType: EditorEntityType;
        entityId: string;
    }) => Promise<void>;
    onDeleteDefinitionGlobal: (request: {
        definitionId: string;
    }) => Promise<void>;
    onImportImage: (file: File) => Promise<string>;
    onAction?: (entry: {
        type:
            | "metafield_created"
            | "metafield_deleted"
            | "metafield_reordered"
            | "metafield_value_changed";
        assignmentId?: string;
        definitionId?: string;
        payload?: Record<string, unknown>;
    }) => void;
    hideControls?: boolean;
    disableDnd?: boolean;
    controlsOnly?: boolean;
};

const areValuesEqual = (left: unknown, right: unknown): boolean => {
    if (Object.is(left, right)) {
        return true;
    }

    try {
        return JSON.stringify(left) === JSON.stringify(right);
    } catch {
        return false;
    }
};

const toUiValue = (
    definition: WorkspaceMetafieldDefinition,
    rawValue: unknown,
): MetafieldUiValue => {
    if (
        rawValue &&
        typeof rawValue === "object" &&
        "kind" in rawValue &&
        "value" in rawValue
    ) {
        const kind = (rawValue as { kind?: unknown }).kind;
        const value = (rawValue as { value?: unknown }).value;

        if (kind === "field") {
            return { kind, value: typeof value === "string" ? value : "" };
        }

        if (kind === "paragraph") {
            return { kind, value: typeof value === "string" ? value : "" };
        }

        if (kind === "select") {
            return {
                kind,
                value: Array.isArray(value)
                    ? value.filter(
                          (entry): entry is string => typeof entry === "string",
                      )
                    : [],
            };
        }
    }

    if (definition.valueType === "string[]") {
        return {
            kind: "select",
            value: Array.isArray(rawValue)
                ? rawValue.filter(
                      (entry): entry is string => typeof entry === "string",
                  )
                : [],
        };
    }

    return {
        kind: "field",
        value: typeof rawValue === "string" ? rawValue : "",
    };
};

const makeInitialValue = (kind: MetafieldUiKind): MetafieldUiValue => {
    if (kind === "paragraph") {
        return { kind, value: "" };
    }
    if (kind === "select") {
        return { kind, value: [] };
    }
    return { kind: "field", value: "" };
};

type AssignmentRow = {
    assignment: WorkspaceMetafieldAssignment;
    definition: WorkspaceMetafieldDefinition;
};

type MetafieldCardProps = {
    row: AssignmentRow;
    entityType: EditorEntityType;
    entityId: string;
    isBusy: boolean;
    showDelete: boolean;
    withBusy: (action: () => Promise<void>) => Promise<void>;
    onUnassign: Props["onUnassign"];
    onAction?: Props["onAction"];
    uiKind: MetafieldUiKind;
    renderValueEditor: (
        assignment: WorkspaceMetafieldAssignment,
        definition: WorkspaceMetafieldDefinition,
    ) => React.ReactNode;
};

type SortableMetafieldCardProps = MetafieldCardProps;

const StaticMetafieldCard: React.FC<MetafieldCardProps> = ({
        row,
        entityType,
        entityId,
        isBusy,
    showDelete,
        withBusy,
        onUnassign,
        onAction,
        uiKind,
        renderValueEditor,
    }) => {
        const { assignment, definition } = row;

        return (
            <div className="metafield-card">
                <div className="metafield-card-header">
                    <p className="panel-label">{definition.name}</p>
                    {showDelete ? (
                        <div className="metafield-actions">
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                    void withBusy(async () => {
                                        await onUnassign({
                                            definitionId: definition.id,
                                            entityType,
                                            entityId,
                                        });
                                        onAction?.({
                                            type: "metafield_deleted",
                                            assignmentId: assignment.id,
                                            definitionId: definition.id,
                                        });
                                    })
                                }
                                disabled={isBusy}
                            >
                                Delete
                            </Button>
                        </div>
                    ) : null}
                </div>
                <div
                    className={
                        uiKind === "field"
                            ? "metafield-value metafield-value--field"
                            : "metafield-value"
                    }
                >
                    {renderValueEditor(assignment, definition)}
                </div>
            </div>
        );
    };

const SortableMetafieldCard: React.FC<SortableMetafieldCardProps> = ({
        row,
        entityType,
        entityId,
        isBusy,
    showDelete,
        withBusy,
        onUnassign,
        onAction,
        uiKind,
        renderValueEditor,
    }) => {
    const { assignment, definition } = row;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: assignment.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`metafield-card${isDragging ? " is-dragging" : ""}`}
        >
            <div className="metafield-card-header">
                <div className="metafield-card-title-row">
                    <button
                        type="button"
                        className="metafield-card-handle"
                        aria-label={`Reorder ${definition.name}`}
                        {...attributes}
                        {...listeners}
                    >
                        ⠿
                    </button>
                    <p className="panel-label">
                        {definition.name}
                    </p>
                </div>
                {showDelete ? (
                    <div className="metafield-actions">
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                                void withBusy(async () => {
                                    await onUnassign({
                                        definitionId: definition.id,
                                        entityType,
                                        entityId,
                                    });
                                    onAction?.({
                                        type: "metafield_deleted",
                                        assignmentId: assignment.id,
                                        definitionId: definition.id,
                                    });
                                })
                            }
                            disabled={isBusy}
                        >
                            Delete
                        </Button>
                    </div>
                ) : null}
            </div>
            <div
                className={
                    uiKind === "field"
                        ? "metafield-value metafield-value--field"
                        : "metafield-value"
                }
            >
                {renderValueEditor(assignment, definition)}
            </div>
        </div>
    );
};

export const MetafieldsSection: React.FC<Props> = ({
    projectId,
    entityType,
    entityId,
    definitions,
    assignments,
    availableDocuments = [],
    onNavigateToDocument,
    onCreateOrReuseDefinition,
    onSaveDefinitionSelectOptions,
    onAssignDefinition,
    onSaveValue,
    onUnassign,
    onAction,
    hideControls = false,
    disableDnd = false,
    controlsOnly = false,
}) => {
    const [isBusy, setIsBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [stagedValues, setStagedValues] = React.useState<
        Record<string, unknown>
    >({});
    const paragraphAutosaveTimersRef = React.useRef<
        Record<string, ReturnType<typeof setTimeout>>
    >({});
    const [createDraft, setCreateDraft] = React.useState<{
        name: string;
        kind: MetafieldUiKind;
    } | null>(null);

    const assignmentRows = React.useMemo(
        () =>
            assignments
                .map((assignment) => {
                    const definition = definitions.find(
                        (item) => item.id === assignment.definitionId,
                    );
                    if (!definition) return null;
                    return { assignment, definition };
                })
                .filter(
                    (
                        item,
                    ): item is {
                        assignment: WorkspaceMetafieldAssignment;
                        definition: WorkspaceMetafieldDefinition;
                    } => item !== null,
                )
                .sort(
                    (a, b) =>
                        a.assignment.orderIndex - b.assignment.orderIndex ||
                        a.definition.name.localeCompare(b.definition.name),
                ),
        [assignments, definitions],
    );

    const [orderedAssignmentIds, setOrderedAssignmentIds] = React.useState<
        string[]
    >([]);

    React.useEffect(() => {
        const nextIds = assignmentRows.map((row) => row.assignment.id);

        setOrderedAssignmentIds((prev) => {
            const stillPresent = prev.filter((id) => nextIds.includes(id));
            const additions = nextIds.filter(
                (id) => !stillPresent.includes(id),
            );
            return [...stillPresent, ...additions];
        });
    }, [assignmentRows]);

    const assignmentRowsById = React.useMemo(
        () => new Map(assignmentRows.map((row) => [row.assignment.id, row])),
        [assignmentRows],
    );

    const orderedAssignmentRows = React.useMemo(
        () =>
            orderedAssignmentIds
                .map((id) => assignmentRowsById.get(id))
                .filter((row): row is AssignmentRow => Boolean(row)),
        [orderedAssignmentIds, assignmentRowsById],
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const withBusy = React.useCallback(async (action: () => Promise<void>) => {
        setIsBusy(true);
        setError(null);
        try {
            await action();
        } catch (actionError) {
            setError(
                actionError instanceof Error
                    ? actionError.message
                    : "Metafield action failed.",
            );
        } finally {
            setIsBusy(false);
        }
    }, []);

    const handleDragEnd = React.useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id) {
                return;
            }

            setOrderedAssignmentIds((current) => {
                const oldIndex = current.indexOf(String(active.id));
                const newIndex = current.indexOf(String(over.id));
                if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
                    return current;
                }

                const reorderedIds = arrayMove(current, oldIndex, newIndex);
                const start = Math.min(oldIndex, newIndex);
                const end = Math.max(oldIndex, newIndex);

                void withBusy(async () => {
                    for (let index = start; index <= end; index += 1) {
                        const assignmentId = reorderedIds[index];
                        const row = assignmentRowsById.get(assignmentId);
                        if (!row || row.assignment.orderIndex === index) {
                            continue;
                        }

                        await onSaveValue({
                            assignmentId,
                            orderIndex: index,
                        });
                    }
                });

                onAction?.({
                    type: "metafield_reordered",
                    payload: { orderedIds: reorderedIds },
                });

                return reorderedIds;
            });
        },
        [assignmentRowsById, onAction, onSaveValue, withBusy],
    );

    const handleCreateDraftSubmit = async () => {
        if (!createDraft) return;

        await withBusy(async () => {
            const created = await onCreateOrReuseDefinition({
                projectId,
                name: createDraft.name,
                scope: entityType,
                valueType:
                    createDraft.kind === "select" ? "string[]" : "string",
            });

            const { assignment } = await onAssignDefinition({
                definitionId: created.definition.id,
                entityType,
                entityId,
            });

            await onSaveValue({
                assignmentId: assignment.id,
                value: makeInitialValue(createDraft.kind),
            });

            onAction?.({
                type: "metafield_created",
                assignmentId: assignment.id,
                definitionId: created.definition.id,
                payload: {
                    name: createDraft.name,
                    kind: createDraft.kind,
                },
            });

            setCreateDraft(null);
        });
    };

    const saveValue = async (assignmentId: string, value: unknown) => {
        const existing = assignmentRowsById.get(assignmentId)?.assignment;
        if (existing && areValuesEqual(existing.valueJson, value)) {
            setStagedValues((prev) => {
                if (!(assignmentId in prev)) {
                    return prev;
                }

                const next = { ...prev };
                delete next[assignmentId];
                return next;
            });
            return;
        }

        setStagedValues((prev) => ({ ...prev, [assignmentId]: value }));
        await withBusy(async () => {
            await onSaveValue({ assignmentId, value });
        });
        onAction?.({
            type: "metafield_value_changed",
            assignmentId,
        });
    };

    React.useEffect(() => {
        return () => {
            Object.values(paragraphAutosaveTimersRef.current).forEach((timer) =>
                clearTimeout(timer),
            );
        };
    }, []);

    const renderValueEditor = (
        assignment: WorkspaceMetafieldAssignment,
        definition: WorkspaceMetafieldDefinition,
    ) => {
        const stagedRaw =
            stagedValues[assignment.id] !== undefined
                ? stagedValues[assignment.id]
                : assignment.valueJson;
        const staged = toUiValue(definition, stagedRaw);

        if (staged.kind === "field") {
            return (
                <Input
                    value={staged.value}
                    placeholder="Enter value"
                    onChange={(event) =>
                        setStagedValues((prev) => ({
                            ...prev,
                            [assignment.id]: {
                                kind: "field",
                                value: event.target.value,
                            },
                        }))
                    }
                    onBlur={() =>
                        void saveValue(assignment.id, {
                            kind: "field",
                            value: staged.value,
                        })
                    }
                />
            );
        }

        if (staged.kind === "paragraph") {
            return (
                <ParagraphRichField
                    syncSourceKey={`metafield:${assignment.id}:paragraph`}
                    value={staged.value}
                    rows={6}
                    placeholder="Write paragraph..."
                    availableDocuments={availableDocuments}
                    onNavigateToDocument={onNavigateToDocument}
                    onChange={(value) => {
                        setStagedValues((prev) => ({
                            ...prev,
                            [assignment.id]: {
                                kind: "paragraph",
                                value,
                            },
                        }));

                        const existingTimer =
                            paragraphAutosaveTimersRef.current[assignment.id];
                        if (existingTimer) {
                            clearTimeout(existingTimer);
                        }

                        paragraphAutosaveTimersRef.current[assignment.id] =
                            setTimeout(() => {
                                void saveValue(assignment.id, {
                                    kind: "paragraph",
                                    value,
                                });
                            }, 700);
                    }}
                />
            );
        }

        return (
            <TraitsInput
                value={staged.value}
                options={
                    definition.selectOptions
                        .slice()
                        .sort(
                            (left, right) => left.orderIndex - right.orderIndex,
                        )
                        .map((option) => ({
                            id: option.id,
                            label: option.label,
                            ...(option.icon ? { icon: option.icon } : {}),
                        }))
                }
                placeholder="Add options..."
                onCreateOption={async (label) => {
                    const existing = definition.selectOptions.find(
                        (option) =>
                            option.label.trim().toLowerCase() ===
                            label.trim().toLowerCase(),
                    );

                    if (existing) {
                        return {
                            id: existing.id,
                            label: existing.label,
                            ...(existing.icon ? { icon: existing.icon } : {}),
                        };
                    }

                    const response = await onSaveDefinitionSelectOptions({
                        definitionId: definition.id,
                        options: [
                            ...definition.selectOptions.map((option) => ({
                                id: option.id,
                                label: option.label,
                                ...(option.icon ? { icon: option.icon } : {}),
                            })),
                            { label },
                        ],
                    });

                    const created = response.options.find(
                        (option) =>
                            option.label.trim().toLowerCase() ===
                            label.trim().toLowerCase(),
                    );

                    return created ?? null;
                }}
                onChange={(next) =>
                    void saveValue(assignment.id, {
                        kind: "select",
                        value: next,
                    })
                }
            />
        );
    };

    const getUiKindForAssignment = React.useCallback(
        (assignment: WorkspaceMetafieldAssignment): MetafieldUiKind => {
            const definition = definitions.find(
                (item) => item.id === assignment.definitionId,
            );
            if (!definition) {
                return "field";
            }

            return toUiValue(definition, assignment.valueJson).kind;
        },
        [definitions],
    );

    const CardComponent = disableDnd
        ? StaticMetafieldCard
        : SortableMetafieldCard;
    const cardsClassName = hideControls
        ? "metafield-list metafield-canvas metafield-list--embedded"
        : "metafield-list metafield-canvas";

    const cards = (
        <div className={cardsClassName}>
            {orderedAssignmentRows.map((row) => (
                <CardComponent
                    key={row.assignment.id}
                    row={row}
                    entityType={entityType}
                    entityId={entityId}
                    isBusy={isBusy}
                    showDelete={!hideControls}
                    withBusy={withBusy}
                    onUnassign={onUnassign}
                    onAction={onAction}
                    uiKind={getUiKindForAssignment(row.assignment)}
                    renderValueEditor={renderValueEditor}
                />
            ))}
        </div>
    );

    return (
        <>
            {!hideControls && !createDraft ? (
                <div className="metafield-actions">
                    <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                            setCreateDraft({
                                name: "",
                                kind: "field",
                            })
                        }
                    >
                        Add Metafield
                    </Button>
                </div>
            ) : null}

            {!hideControls && createDraft ? (
                <div className="metafield-create-draft">
                    <div className="metafield-create-grid">
                        <Input
                            value={createDraft.name}
                            onChange={(event) =>
                                setCreateDraft((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              name: event.target.value,
                                          }
                                        : prev,
                                )
                            }
                            placeholder="Metafield name"
                        />
                        <select
                            className="input"
                            value={createDraft.kind}
                            onChange={(event) =>
                                setCreateDraft((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              kind: event.target
                                                  .value as MetafieldUiKind,
                                          }
                                        : prev,
                                )
                            }
                        >
                            <option value="field">Field</option>
                            <option value="paragraph">Paragraph</option>
                            <option value="select">Select</option>
                        </select>
                    </div>
                    <div className="metafield-actions">
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleCreateDraftSubmit()}
                            disabled={isBusy || !createDraft.name.trim()}
                        >
                            Create
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setCreateDraft(null)}
                            disabled={isBusy}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : null}

            {!controlsOnly ? (
                disableDnd ? (
                    cards
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={orderedAssignmentIds}
                            strategy={verticalListSortingStrategy}
                        >
                            {cards}
                        </SortableContext>
                    </DndContext>
                )
            ) : null}

            {error ? <span className="card-hint is-error">{error}</span> : null}
        </>
    );
};
