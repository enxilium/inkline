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
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type {
    WorkspaceCharacter,
    WorkspaceLocation,
    WorkspaceMetafieldAssignment,
    WorkspaceMetafieldDefinition,
    WorkspaceOrganization,
} from "../../types";
import { ActionDropdown } from "../ui/ActionDropdown";
import { ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons";
import { ListInput, type DocumentRef } from "../ui/ListInput";
import {
    SearchableMultiSelect,
    type SelectOption,
} from "../ui/SearchableSelect";
import { TagsInput } from "../ui/Tags";
import { showToast } from "../ui/GenerationProgressToast";
import { MetafieldsSection } from "./MetafieldsSection";
import {
    normalizeUserFacingError,
    type UserErrorContext,
} from "../../utils/userFacingError";

export type OrganizationEditorValues = {
    name: string;
    description: string[];
    mission: string[];
    tags: string[];
    locationIds: string[];
};

type NewMetafieldKind = "field" | "paragraph" | "select";

type OrganizationSectionId =
    | "description"
    | "mission"
    | "tags"
    | "locations"
    | "portrait"
    | "audio"
    | "reach";

type OrganizationColumnId = "left" | "right";

type OrganizationSectionPlacement = {
    left: string[];
    right: string[];
};

export type OrganizationEditorProps = {
    projectId: string;
    organization: WorkspaceOrganization;
    locations: WorkspaceLocation[];
    allCharacters: WorkspaceCharacter[];
    allLocations: WorkspaceLocation[];
    allOrganizations: WorkspaceOrganization[];
    metafieldDefinitions: WorkspaceMetafieldDefinition[];
    metafieldAssignments: WorkspaceMetafieldAssignment[];
    imageOptions: SelectOption[];
    gallerySources: string[];
    songUrl?: string;
    availableDocuments?: DocumentRef[];
    onSubmit: (values: OrganizationEditorValues) => Promise<void>;
    onNavigateToDocument?: (ref: DocumentRef) => void;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onGenerateSong: () => Promise<void>;
    onImportSong: (file: File) => Promise<void>;
    onGeneratePlaylist: () => Promise<void>;
    onImportPlaylist: (file: File) => Promise<void>;
    onCreateOrReuseMetafieldDefinition: (request: {
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
    }) => Promise<{ definition: WorkspaceMetafieldDefinition }>;
    onAssignMetafieldToEntity: (request: {
        definitionId: string;
        entityType: "character" | "location" | "organization";
        entityId: string;
    }) => Promise<{ assignment: WorkspaceMetafieldAssignment }>;
    onSaveMetafieldValue: (request: {
        assignmentId: string;
        value?: unknown;
        orderIndex?: number;
    }) => Promise<void>;
    onRemoveMetafieldFromEntity: (request: {
        definitionId: string;
        entityType: "character" | "location" | "organization";
        entityId: string;
    }) => Promise<void>;
    onDeleteMetafieldDefinitionGlobal: (request: {
        definitionId: string;
    }) => Promise<void>;
    onImportMetafieldImage: (file: File) => Promise<string>;
    focusTitleOnMount?: boolean;
};

const defaultValues = (
    organization: WorkspaceOrganization,
): OrganizationEditorValues => ({
    name: organization.name ?? "",
    description: organization.description
        ? organization.description.split("\n").filter((s) => s.trim())
        : [],
    mission: organization.mission
        ? organization.mission.split("\n").filter((s) => s.trim())
        : [],
    tags: organization.tags ?? [],
    locationIds: organization.locationIds ?? [],
});

const ALL_SECTION_IDS: OrganizationSectionId[] = [
    "description",
    "mission",
    "tags",
    "locations",
    "portrait",
    "audio",
    "reach",
];

const DEFAULT_SECTION_PLACEMENT: OrganizationSectionPlacement = {
    left: ["description", "mission", "tags", "locations", "reach"],
    right: ["portrait", "audio"],
};

const SECTION_TITLE: Record<OrganizationSectionId, string> = {
    description: "Description",
    mission: "Mission",
    tags: "Tags",
    locations: "Locations",
    portrait: "Portrait",
    audio: "Audio Assets",
    reach: "Reach",
};

const COLUMN_DROP_ID = {
    left: "organization-left-column",
    right: "organization-right-column",
} as const;

const isOrganizationSectionId = (
    value: string,
): value is OrganizationSectionId =>
    ALL_SECTION_IDS.includes(value as OrganizationSectionId);

const isMetafieldItemId = (
    value: string,
    assignments: WorkspaceMetafieldAssignment[],
): boolean => assignments.some((assignment) => assignment.id === value);

const findColumnForSection = (
    placement: OrganizationSectionPlacement,
    id: string,
): OrganizationColumnId | null => {
    if (id === COLUMN_DROP_ID.left) {
        return "left";
    }
    if (id === COLUMN_DROP_ID.right) {
        return "right";
    }
    if (placement.left.includes(id)) {
        return "left";
    }
    if (placement.right.includes(id)) {
        return "right";
    }
    return null;
};

type SortableSectionCardProps = {
    id: string;
    title: string;
    children: React.ReactNode;
};

const SortableSectionCard: React.FC<SortableSectionCardProps> = ({
    id,
    title,
    children,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <section
            ref={setNodeRef}
            style={style}
            className={`entity-section-card${isDragging ? " is-dragging" : ""}`}
        >
            <div className="entity-section-card-header">
                <h3 className="entity-section-card-title">{title}</h3>
                <button
                    type="button"
                    className="entity-section-card-handle"
                    aria-label={`Reorder ${title} section`}
                    {...attributes}
                    {...listeners}
                >
                    ⋮⋮
                </button>
            </div>
            <div className="entity-section-card-body">{children}</div>
        </section>
    );
};

export const OrganizationEditor: React.FC<OrganizationEditorProps> = ({
    organization,
    locations,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onSubmit,
    onNavigateToDocument,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
    projectId,
    allCharacters,
    allLocations,
    allOrganizations,
    metafieldDefinitions,
    metafieldAssignments,
    imageOptions,
    onCreateOrReuseMetafieldDefinition,
    onAssignMetafieldToEntity,
    onSaveMetafieldValue,
    onRemoveMetafieldFromEntity,
    onDeleteMetafieldDefinitionGlobal,
    onImportMetafieldImage,
    focusTitleOnMount = false,
}) => {
    const [values, setValues] = React.useState<OrganizationEditorValues>(() =>
        defaultValues(organization),
    );
    const [, setSaving] = React.useState(false);
    const [assetBusy, setAssetBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const [sectionPlacement, setSectionPlacement] =
        React.useState<OrganizationSectionPlacement>(DEFAULT_SECTION_PLACEMENT);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const songInputRef = React.useRef<HTMLInputElement>(null);
    const playlistInputRef = React.useRef<HTMLInputElement>(null);
    const titleInputRef = React.useRef<HTMLInputElement>(null);
    const isUserChange = React.useRef(false);
    const pendingMetafieldColumnsRef = React.useRef<
        Map<string, OrganizationColumnId>
    >(new Map());

    const toFriendlyError = React.useCallback(
        (err: unknown, fallback: string, context?: UserErrorContext) =>
            normalizeUserFacingError(err, fallback, context),
        [],
    );

    React.useEffect(() => {
        isUserChange.current = false;
        setValues(defaultValues(organization));
        setError(null);
        setSectionPlacement(DEFAULT_SECTION_PLACEMENT);
    }, [organization]);

    React.useEffect(() => {
        if (!focusTitleOnMount) {
            return;
        }

        requestAnimationFrame(() => {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        });
    }, [focusTitleOnMount]);

    React.useEffect(() => {
        if (!gallerySources.length) {
            firstImageRef.current = undefined;
            setCurrentImageIndex(0);
            return;
        }

        const currentFirst = gallerySources[0];
        const previousFirst = firstImageRef.current;
        firstImageRef.current = currentFirst;

        setCurrentImageIndex((prev) => {
            if (!gallerySources.length) {
                return 0;
            }
            if (currentFirst && currentFirst !== previousFirst) {
                return 0;
            }
            if (prev >= gallerySources.length) {
                return gallerySources.length - 1;
            }
            return prev;
        });
    }, [gallerySources]);

    React.useEffect(() => {
        const assignmentIds = metafieldAssignments.map(
            (assignment) => assignment.id,
        );

        setSectionPlacement((current) => {
            const filteredLeft = current.left.filter(
                (id) =>
                    isOrganizationSectionId(id) || assignmentIds.includes(id),
            );
            const filteredRight = current.right.filter(
                (id) =>
                    isOrganizationSectionId(id) || assignmentIds.includes(id),
            );

            const present = new Set([...filteredLeft, ...filteredRight]);
            const missing = assignmentIds.filter((id) => !present.has(id));

            if (
                filteredLeft.length === current.left.length &&
                filteredRight.length === current.right.length &&
                missing.length === 0
            ) {
                return current;
            }

            const missingLeft: string[] = [];
            const missingRight: string[] = [];
            for (const id of missing) {
                const pendingColumn = pendingMetafieldColumnsRef.current.get(id);
                if (pendingColumn === "right") {
                    missingRight.push(id);
                } else {
                    missingLeft.push(id);
                }
                pendingMetafieldColumnsRef.current.delete(id);
            }

            return {
                left: [...filteredLeft, ...missingLeft],
                right: [...filteredRight, ...missingRight],
            };
        });
    }, [metafieldAssignments]);

    const locationOptions: SelectOption[] = React.useMemo(
        () =>
            locations.map((loc) => ({
                id: loc.id,
                label: loc.name || "Untitled location",
            })),
        [locations],
    );

    const handleChange = (
        field: keyof OrganizationEditorValues,
        value: string | string[],
    ) => {
        isUserChange.current = true;
        setValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await onSubmit(values);
        } catch (submitError) {
            setError(
                toFriendlyError(submitError, "Failed to save organization."),
            );
        } finally {
            setSaving(false);
        }
    };

    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (!isUserChange.current) {
            return;
        }

        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = setTimeout(() => {
            void handleSubmit();
        }, 1000);

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        };
    }, [values]);

    const triggerFilePick = () => fileInputRef.current?.click();
    const triggerSongPick = () => songInputRef.current?.click();
    const triggerPlaylistPick = () => playlistInputRef.current?.click();

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setAssetBusy(true);
        setError(null);
        try {
            await onImportPortrait(file);
        } catch (importError) {
            setError(toFriendlyError(importError, "Failed to import crest."));
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handleSongChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAssetBusy(true);
        setError(null);
        try {
            await onImportSong(file);
        } catch (importError) {
            setError(toFriendlyError(importError, "Failed to import song."));
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handlePlaylistChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAssetBusy(true);
        setError(null);
        try {
            await onImportPlaylist(file);
        } catch (importError) {
            setError(toFriendlyError(importError, "Failed to import playlist."));
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handleGenerate = async () => {
        setAssetBusy(true);
        setError(null);
        try {
            await onGeneratePortrait();
        } catch (generateError) {
            showToast({
                id: "generation-image",
                variant: "error",
                title: "Image generation failed",
                description: toFriendlyError(
                    generateError,
                    "Failed to generate crest.",
                    "generation-image",
                ),
                durationMs: 6000,
            });
        } finally {
            setAssetBusy(false);
        }
    };

    const handleAssetAction = async (
        action: () => Promise<void>,
        errorMessage: string,
        context: UserErrorContext,
        toastId: string,
        toastTitle: string,
    ) => {
        setAssetBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            showToast({
                id: toastId,
                variant: "error",
                title: toastTitle,
                description: toFriendlyError(err, errorMessage, context),
                durationMs: 6000,
            });
        } finally {
            setAssetBusy(false);
        }
    };

    const portraitUrl = gallerySources[currentImageIndex];
    const canCycleGallery = gallerySources.length > 1;

    const showNextImage = () => {
        if (!canCycleGallery) {
            return;
        }
        setCurrentImageIndex((prev) => (prev + 1) % gallerySources.length);
    };

    const showPreviousImage = () => {
        if (!canCycleGallery) {
            return;
        }
        setCurrentImageIndex(
            (prev) =>
                (prev - 1 + gallerySources.length) % gallerySources.length,
        );
    };

    const runtimeReach = React.useMemo(
        () =>
            locations.filter((location) =>
                (location.organizationIds ?? []).includes(organization.id),
            ).length,
        [locations, organization.id],
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const leftDroppable = useDroppable({ id: COLUMN_DROP_ID.left });
    const rightDroppable = useDroppable({ id: COLUMN_DROP_ID.right });

    const createMetafieldInColumn = React.useCallback(
        async (targetColumn: OrganizationColumnId, kind: NewMetafieldKind) => {
            const existingNames = new Set(
                metafieldDefinitions
                    .filter(
                        (definition) =>
                            definition.scope === "organization" &&
                            !definition.name.startsWith("_sys:"),
                    )
                    .map((definition) => definition.name.trim().toLowerCase()),
            );

            let candidateIndex = metafieldDefinitions.length + 1;
            let candidateName = `Metafield ${candidateIndex}`;
            while (existingNames.has(candidateName.toLowerCase())) {
                candidateIndex += 1;
                candidateName = `Metafield ${candidateIndex}`;
            }

            try {
                const definitionResponse =
                    await onCreateOrReuseMetafieldDefinition({
                        projectId,
                        name: candidateName,
                        scope: "organization",
                        valueType: kind === "select" ? "string[]" : "string",
                    });

                const assignmentResponse = await onAssignMetafieldToEntity({
                    definitionId: definitionResponse.definition.id,
                    entityType: "organization",
                    entityId: organization.id,
                });

                pendingMetafieldColumnsRef.current.set(
                    assignmentResponse.assignment.id,
                    targetColumn,
                );

                setSectionPlacement((current) => {
                    const nextLeft = current.left.filter(
                        (id) => id !== assignmentResponse.assignment.id,
                    );
                    const nextRight = current.right.filter(
                        (id) => id !== assignmentResponse.assignment.id,
                    );

                    return targetColumn === "left"
                        ? {
                              left: [...nextLeft, assignmentResponse.assignment.id],
                              right: nextRight,
                          }
                        : {
                              left: nextLeft,
                              right: [...nextRight, assignmentResponse.assignment.id],
                          };
                });

                const initialValue =
                    kind === "select"
                        ? { kind: "select", value: [] as string[] }
                        : {
                              kind,
                              value: "",
                          };

                await onSaveMetafieldValue({
                    assignmentId: assignmentResponse.assignment.id,
                    value: initialValue,
                });
            } catch (createError) {
                const message = toFriendlyError(
                    createError,
                    "Failed to create metafield.",
                );
                setError(message);
                showToast({
                    id: "metafield-create-organization",
                    variant: "error",
                    title: "Metafield creation failed",
                    description: message,
                    durationMs: 6000,
                });
            }
        },
        [
            metafieldDefinitions,
            onAssignMetafieldToEntity,
            onCreateOrReuseMetafieldDefinition,
            onSaveMetafieldValue,
            organization.id,
            projectId,
            toFriendlyError,
        ],
    );

    const buildAddSectionOptions = React.useCallback(
        (targetColumn: OrganizationColumnId) => {
            const metafieldOptions = [
                {
                    label: "Add Field Metafield",
                    onClick: () => {
                        void createMetafieldInColumn(targetColumn, "field");
                    },
                },
                {
                    label: "Add Paragraph Metafield",
                    onClick: () => {
                        void createMetafieldInColumn(
                            targetColumn,
                            "paragraph",
                        );
                    },
                },
                {
                    label: "Add Select Metafield",
                    onClick: () => {
                        void createMetafieldInColumn(targetColumn, "select");
                    },
                },
            ];

            return metafieldOptions;
        },
        [createMetafieldInColumn],
    );

    const handleSectionDragEnd = React.useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over) {
                return;
            }

            const activeId = String(active.id);
            const overId = String(over.id);

            let nextPlacement: OrganizationSectionPlacement | null = null;

            setSectionPlacement((current) => {
                const sourceColumn = findColumnForSection(current, activeId);
                const targetColumn = findColumnForSection(current, overId);
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

                const sourceItems = current[sourceColumn].filter(
                    (id) => id !== activeId,
                );
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

            const orderedMetafieldIds = [
                ...nextPlacement.left,
                ...nextPlacement.right,
            ].filter((id) => isMetafieldItemId(id, metafieldAssignments));

            void (async () => {
                try {
                    await Promise.all(
                        orderedMetafieldIds.map((assignmentId, orderIndex) => {
                            const assignment = metafieldAssignments.find(
                                (item) => item.id === assignmentId,
                            );
                            if (
                                !assignment ||
                                assignment.orderIndex === orderIndex
                            ) {
                                return Promise.resolve();
                            }

                            return onSaveMetafieldValue({
                                assignmentId,
                                orderIndex,
                            });
                        }),
                    );
                } catch (dragSaveError) {
                    const message = toFriendlyError(
                        dragSaveError,
                        "The card moved locally but failed to sync to cloud. Please resolve the sync conflict or retry.",
                    );
                    setError(message);
                    showToast({
                        id: "metafield-reorder-sync-organization",
                        variant: "error",
                        title: "Metafield reorder sync failed",
                        description: message,
                        durationMs: 6000,
                    });
                }
            })();
        },
        [metafieldAssignments, onSaveMetafieldValue, toFriendlyError],
    );

    const handleSectionDragOver = React.useCallback((event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) {
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        setSectionPlacement((current) => {
            const sourceColumn = findColumnForSection(current, activeId);
            const targetColumn = findColumnForSection(current, overId);

            if (
                !sourceColumn ||
                !targetColumn ||
                sourceColumn === targetColumn
            ) {
                return current;
            }

            const sourceItems = current[sourceColumn].filter(
                (id) => id !== activeId,
            );
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
    }, []);

    const metafieldDefinitionsById = React.useMemo(
        () =>
            new Map(
                metafieldDefinitions.map((definition) => [
                    definition.id,
                    definition,
                ]),
            ),
        [metafieldDefinitions],
    );

    const metafieldAssignmentsById = React.useMemo(
        () =>
            new Map(
                metafieldAssignments.map((assignment) => [assignment.id, assignment]),
            ),
        [metafieldAssignments],
    );

    const renderSection = React.useCallback(
        (itemId: string) => {
            if (!isOrganizationSectionId(itemId)) {
                const assignment = metafieldAssignmentsById.get(itemId);
                if (!assignment) {
                    return null;
                }

                const definition = metafieldDefinitionsById.get(
                    assignment.definitionId,
                );

                if (!definition) {
                    return null;
                }

                return (
                    <MetafieldsSection
                        key={itemId}
                        projectId={projectId}
                        entityType="organization"
                        entityId={organization.id}
                        definitions={metafieldDefinitions}
                        assignments={[assignment]}
                        characterOptions={allCharacters.map((item) => ({
                            id: item.id,
                            label: item.name || "Untitled character",
                        }))}
                        locationOptions={allLocations.map((item) => ({
                            id: item.id,
                            label: item.name || "Untitled location",
                        }))}
                        organizationOptions={allOrganizations.map((item) => ({
                            id: item.id,
                            label: item.name || "Untitled organization",
                        }))}
                        imageOptions={imageOptions}
                        onCreateOrReuseDefinition={(request) =>
                            onCreateOrReuseMetafieldDefinition({
                                ...request,
                                projectId,
                            })
                        }
                        onAssignDefinition={(request) =>
                            onAssignMetafieldToEntity(request)
                        }
                        onSaveValue={onSaveMetafieldValue}
                        onUnassign={onRemoveMetafieldFromEntity}
                        onDeleteDefinitionGlobal={
                            onDeleteMetafieldDefinitionGlobal
                        }
                        onImportImage={onImportMetafieldImage}
                        hideControls
                        disableDnd
                    />
                );
            }

            const sectionId = itemId;

            if (sectionId === "description") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-field">
                            <ListInput
                                value={values.description}
                                onChange={(items) =>
                                    handleChange("description", items)
                                }
                                placeholder="Add description point... (use / to reference)"
                                addButtonLabel=""
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "mission") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-field">
                            <ListInput
                                value={values.mission}
                                onChange={(items) =>
                                    handleChange("mission", items)
                                }
                                placeholder="Add mission point... (use / to reference)"
                                addButtonLabel=""
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "tags") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-field">
                            <TagsInput
                                value={values.tags}
                                onChange={(tags) => handleChange("tags", tags)}
                                placeholder="Enter one tag per line"
                            />
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "locations") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-field">
                            <SearchableMultiSelect
                                value={values.locationIds}
                                options={locationOptions}
                                onChange={(ids) =>
                                    handleChange("locationIds", ids)
                                }
                                placeholder="Search to add locations..."
                            />
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "portrait") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="portrait-card">
                            <div
                                className={
                                    "portrait-frame" +
                                    (portraitUrl ? " has-image" : "")
                                }
                                style={
                                    portraitUrl
                                        ? {
                                              backgroundImage: `url("${portraitUrl}")`,
                                          }
                                        : undefined
                                }
                            >
                                {!portraitUrl ? (
                                    <span className="portrait-placeholder">
                                        No crest yet
                                    </span>
                                ) : null}
                            </div>
                            <div className="portrait-toolbar">
                                <div className="portrait-gallery-nav">
                                    <button
                                        type="button"
                                        className="gallery-nav-btn"
                                        onClick={showPreviousImage}
                                        disabled={!canCycleGallery}
                                    >
                                        <ChevronLeftIcon size={14} />
                                    </button>
                                    <span className="gallery-nav-label">
                                        {gallerySources.length > 0
                                            ? `${currentImageIndex + 1} of ${gallerySources.length}`
                                            : "0 of 0"}
                                    </span>
                                    <button
                                        type="button"
                                        className="gallery-nav-btn"
                                        onClick={showNextImage}
                                        disabled={!canCycleGallery}
                                    >
                                        <ChevronRightIcon size={14} />
                                    </button>
                                </div>
                                <ActionDropdown
                                    disabled={assetBusy}
                                    options={[
                                        {
                                            label: "Generate crest",
                                            onClick: handleGenerate,
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import image",
                                            onClick: triggerFilePick,
                                            disabled: assetBusy,
                                        },
                                    ]}
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "audio") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-summary">
                            <div className="audio-asset-row">
                                <span className="audio-asset-label">
                                    Soundtrack
                                </span>
                                {songUrl && (
                                    <audio
                                        controls
                                        src={songUrl}
                                        className="audio-asset-player"
                                    />
                                )}
                                <ActionDropdown
                                    disabled={assetBusy}
                                    options={[
                                        {
                                            label: organization.bgmId
                                                ? "Regenerate"
                                                : "Generate",
                                            onClick: () =>
                                                void handleAssetAction(
                                                    onGenerateSong,
                                                    "Song generation failed",
                                                    "generation-audio",
                                                    "generation-audio",
                                                    "Audio generation failed",
                                                ),
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import",
                                            onClick: triggerSongPick,
                                            disabled: assetBusy,
                                        },
                                    ]}
                                />
                                <input
                                    ref={songInputRef}
                                    type="file"
                                    accept="audio/*"
                                    className="sr-only"
                                    onChange={handleSongChange}
                                />
                            </div>
                            <div className="audio-asset-row">
                                <span className="audio-asset-label">
                                    Playlist
                                </span>
                                <ActionDropdown
                                    disabled={assetBusy}
                                    options={[
                                        {
                                            label: organization.playlistId
                                                ? "Regenerate"
                                                : "Generate",
                                            onClick: () =>
                                                void handleAssetAction(
                                                    onGeneratePlaylist,
                                                    "Playlist generation failed",
                                                    "generation-playlist",
                                                    "generation-playlist",
                                                    "Playlist generation failed",
                                                ),
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import",
                                            onClick: triggerPlaylistPick,
                                            disabled: assetBusy,
                                        },
                                    ]}
                                />
                                <input
                                    ref={playlistInputRef}
                                    type="file"
                                    accept=".json"
                                    className="sr-only"
                                    onChange={handlePlaylistChange}
                                />
                            </div>
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "reach") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-summary">
                            <div>
                                <span className="summary-label">Reach</span>
                                <span className="summary-value">
                                    {runtimeReach} locations
                                </span>
                            </div>
                            <div>
                                <span className="summary-label">
                                    Gallery images
                                </span>
                                <span className="summary-value">
                                    {organization.galleryImageIds.length}
                                </span>
                            </div>
                        </div>
                    </SortableSectionCard>
                );
            }

            return null;
        },
        [
            allCharacters,
            allLocations,
            allOrganizations,
            assetBusy,
            availableDocuments,
            canCycleGallery,
            currentImageIndex,
            gallerySources,
            handleAssetAction,
            imageOptions,
            locationOptions,
            metafieldAssignmentsById,
            metafieldDefinitions,
            metafieldDefinitionsById,
            onAssignMetafieldToEntity,
            onCreateOrReuseMetafieldDefinition,
            onDeleteMetafieldDefinitionGlobal,
            onGeneratePlaylist,
            onGenerateSong,
            onImportMetafieldImage,
            onNavigateToDocument,
            onRemoveMetafieldFromEntity,
            onSaveMetafieldValue,
            onGeneratePortrait,
            organization,
            portraitUrl,
            projectId,
            runtimeReach,
            showNextImage,
            showPreviousImage,
            songUrl,
            triggerFilePick,
            triggerPlaylistPick,
            triggerSongPick,
            values.description,
            values.locationIds,
            values.mission,
            values.tags,
        ],
    );

    return (
        <div className="entity-editor-panel">
            <form className="entity-editor" onSubmit={handleSubmit}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragOver={handleSectionDragOver}
                    onDragEnd={handleSectionDragEnd}
                >
                    <div className="entity-editor-grid entity-editor-grid--balanced">
                        <div className="entity-header entity-header--lhs">
                            <div className="entity-header-title">
                                <p className="panel-label">Organization</p>
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    className="entity-name-input"
                                    value={values.name}
                                    onChange={(e) =>
                                        handleChange("name", e.target.value)
                                    }
                                    placeholder="Untitled Organization"
                                />
                            </div>
                        </div>
                        <div className="entity-column-shell entity-column-shell--lhs">
                            <div
                                ref={leftDroppable.setNodeRef}
                                className="entity-column-dropzone"
                            >
                                <SortableContext
                                    items={sectionPlacement.left}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="entity-column entity-column--sortable">
                                        {sectionPlacement.left.map(renderSection)}
                                    </div>
                                </SortableContext>
                            </div>
                            <div className="entity-column-add">
                                <ActionDropdown
                                    options={buildAddSectionOptions("left")}
                                    size={14}
                                />
                            </div>
                        </div>
                        <div className="entity-column-shell entity-column-shell--rhs">
                            <div
                                ref={rightDroppable.setNodeRef}
                                className="entity-column-dropzone"
                            >
                                <SortableContext
                                    items={sectionPlacement.right}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="entity-column entity-column--sortable">
                                        {sectionPlacement.right.map(renderSection)}
                                    </div>
                                </SortableContext>
                            </div>
                            <div className="entity-column-add">
                                <ActionDropdown
                                    options={buildAddSectionOptions("right")}
                                    size={14}
                                />
                            </div>
                        </div>
                    </div>
                </DndContext>
                {error ? <span className="card-hint is-error">{error}</span> : null}
            </form>
        </div>
    );
};
