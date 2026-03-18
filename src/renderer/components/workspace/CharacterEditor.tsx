import React from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
    type DragOverEvent,
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
    WorkspaceCharacter,
    WorkspaceLocation,
    WorkspaceMetafieldAssignment,
    WorkspaceMetafieldDefinition,
    WorkspaceOrganization,
} from "../../types";
import { ActionDropdown } from "../ui/ActionDropdown";
import { ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons";
import { type DocumentRef } from "../ui/ListInput";
import { SearchableSelect, type SelectOption } from "../ui/SearchableSelect";
import { RichTextAreaInput } from "../ui/RichTextAreaInput";
import { showToast } from "../ui/GenerationProgressToast";
import { MetafieldsSection } from "./MetafieldsSection";
import {
    normalizeUserFacingError,
    type UserErrorContext,
} from "../../utils/userFacingError";

export type CharacterEditorValues = {
    name: string;
    description: string;
    currentLocationId: string;
    backgroundLocationId: string;
    organizationId: string;
};

type NewMetafieldKind = "field" | "paragraph" | "select";

export type CharacterEditorProps = {
    projectId: string;
    character: WorkspaceCharacter;
    locations: WorkspaceLocation[];
    organizations: WorkspaceOrganization[];
    allCharacters: WorkspaceCharacter[];
    metafieldDefinitions: WorkspaceMetafieldDefinition[];
    metafieldAssignments: WorkspaceMetafieldAssignment[];
    imageOptions: SelectOption[];
    gallerySources: string[];
    songUrl?: string;
    /** All documents available for slash-command references */
    availableDocuments?: DocumentRef[];
    onSubmit: (values: CharacterEditorValues) => Promise<void>;
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
    onActionLog?: (entry: CharacterEditorActionLog) => Promise<void>;
    onSectionLayoutSync?: (
        placement: CharacterSectionPlacement,
    ) => Promise<void>;
    initialSectionPlacement?: CharacterSectionPlacement;
    /** Navigate to a referenced document */
    onNavigateToDocument?: (ref: DocumentRef) => void;
    focusTitleOnMount?: boolean;
};

const defaultValues = (
    character: WorkspaceCharacter,
): CharacterEditorValues => ({
    name: character.name ?? "",
    description: character.description ?? "",
    currentLocationId: character.currentLocationId ?? "",
    backgroundLocationId: character.backgroundLocationId ?? "",
    organizationId: character.organizationId ?? "",
});

type CharacterSectionId =
    | "description"
    | "portrait"
    | "audio"
    | "currentLocation"
    | "originLocation"
    | "organization";

type CharacterColumnId = "left" | "right";

export type CharacterSectionPlacement = {
    left: string[];
    right: string[];
};

export type CharacterEditorActionLog = {
    action: string;
    payload?: Record<string, unknown>;
};

const ALL_SECTION_IDS: CharacterSectionId[] = [
    "description",
    "portrait",
    "audio",
    "currentLocation",
    "originLocation",
    "organization",
];

const DEFAULT_SECTION_PLACEMENT: CharacterSectionPlacement = {
    left: ["description", "currentLocation", "originLocation", "organization"],
    right: ["portrait", "audio"],
};

const SECTION_TITLE: Record<CharacterSectionId, string> = {
    description: "Description",
    portrait: "Portrait",
    audio: "Audio Assets",
    currentLocation: "Current Location",
    originLocation: "Origin Location",
    organization: "Affiliated Organization",
};

const COLUMN_DROP_ID = {
    left: "character-left-column",
    right: "character-right-column",
} as const;

const isCharacterSectionId = (value: string): value is CharacterSectionId =>
    ALL_SECTION_IDS.includes(value as CharacterSectionId);

const isMetafieldItemId = (
    value: string,
    assignments: WorkspaceMetafieldAssignment[],
): boolean => assignments.some((assignment) => assignment.id === value);

const findColumnForSection = (
    placement: CharacterSectionPlacement,
    id: string,
): CharacterColumnId | null => {
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

export const CharacterEditor: React.FC<CharacterEditorProps> = ({
    character,
    locations,
    organizations,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onSubmit,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
    projectId,
    allCharacters,
    metafieldDefinitions,
    metafieldAssignments,
    imageOptions,
    onCreateOrReuseMetafieldDefinition,
    onAssignMetafieldToEntity,
    onSaveMetafieldValue,
    onRemoveMetafieldFromEntity,
    onDeleteMetafieldDefinitionGlobal,
    onImportMetafieldImage,
    onActionLog,
    onSectionLayoutSync,
    initialSectionPlacement,
    onNavigateToDocument,
    focusTitleOnMount = false,
}) => {
    const [values, setValues] = React.useState<CharacterEditorValues>(() =>
        defaultValues(character),
    );
    const [, setSaving] = React.useState(false);
    const [assetBusy, setAssetBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [sectionPlacement, setSectionPlacement] =
        React.useState<CharacterSectionPlacement>(
            initialSectionPlacement ?? DEFAULT_SECTION_PLACEMENT,
        );
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const songInputRef = React.useRef<HTMLInputElement>(null);
    const playlistInputRef = React.useRef<HTMLInputElement>(null);
    const titleInputRef = React.useRef<HTMLInputElement>(null);
    const isUserChange = React.useRef(false);
    const pendingMetafieldColumnsRef = React.useRef<
        Map<string, CharacterColumnId>
    >(new Map());

    const toFriendlyError = React.useCallback(
        (error: unknown, fallback: string, context?: UserErrorContext) =>
            normalizeUserFacingError(error, fallback, context),
        [],
    );

    React.useEffect(() => {
        isUserChange.current = false;
        setValues(defaultValues(character));
        setError(null);
    }, [character]);

    React.useEffect(() => {
        setSectionPlacement(
            initialSectionPlacement ?? DEFAULT_SECTION_PLACEMENT,
        );
    }, [character.id]);

    React.useEffect(() => {
        const assignmentIds = metafieldAssignments.map(
            (assignment) => assignment.id,
        );

        setSectionPlacement((current) => {
            const filteredLeft = current.left.filter(
                (id) => isCharacterSectionId(id) || assignmentIds.includes(id),
            );
            const filteredRight = current.right.filter(
                (id) => isCharacterSectionId(id) || assignmentIds.includes(id),
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

    // Memoize options for searchable selects
    const locationOptions: SelectOption[] = React.useMemo(
        () =>
            locations.map((loc) => ({
                id: loc.id,
                label: loc.name || "Untitled location",
            })),
        [locations],
    );

    const organizationOptions: SelectOption[] = React.useMemo(
        () =>
            organizations.map((org) => ({
                id: org.id,
                label: org.name || "Untitled organization",
            })),
        [organizations],
    );

    const handleChange = (
        field: keyof CharacterEditorValues,
        value: string,
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
            if (onActionLog) {
                await onActionLog({ action: "character_saved" });
            }
        } catch (submitError) {
            setError(toFriendlyError(submitError, "Failed to save character."));
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
            handleSubmit();
        }, 1000);

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        };
    }, [values]);

    const triggerFilePick = () => {
        fileInputRef.current?.click();
    };

    const triggerSongPick = () => {
        songInputRef.current?.click();
    };

    const triggerPlaylistPick = () => {
        playlistInputRef.current?.click();
    };

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
            setError(
                toFriendlyError(importError, "Failed to import portrait."),
            );
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
            setError(
                toFriendlyError(importError, "Failed to import playlist."),
            );
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
            if (onActionLog) {
                await onActionLog({ action: "portrait_generated" });
            }
        } catch (generateError) {
            showToast({
                id: "generation-image",
                variant: "error",
                title: "Image generation failed",
                description: toFriendlyError(
                    generateError,
                    "Failed to generate portrait.",
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
        void onActionLog?.({
            action: "portrait_navigated",
            payload: { direction: "next" },
        });
    };

    const showPreviousImage = () => {
        if (!canCycleGallery) {
            return;
        }
        setCurrentImageIndex(
            (prev) =>
                (prev - 1 + gallerySources.length) % gallerySources.length,
        );
        void onActionLog?.({
            action: "portrait_navigated",
            payload: { direction: "previous" },
        });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const leftDroppable = useDroppable({
        id: COLUMN_DROP_ID.left,
    });

    const rightDroppable = useDroppable({
        id: COLUMN_DROP_ID.right,
    });

    const createMetafieldInColumn = React.useCallback(
        async (targetColumn: CharacterColumnId, kind: NewMetafieldKind) => {
            const existingNames = new Set(
                metafieldDefinitions
                    .filter(
                        (definition) =>
                            definition.scope === "character" &&
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
                        scope: "character",
                        valueType: kind === "select" ? "string[]" : "string",
                    });

                const assignmentResponse = await onAssignMetafieldToEntity({
                    definitionId: definitionResponse.definition.id,
                    entityType: "character",
                    entityId: character.id,
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

                    const nextPlacement =
                        targetColumn === "left"
                            ? {
                                  left: [...nextLeft, assignmentResponse.assignment.id],
                                  right: nextRight,
                              }
                            : {
                                  left: nextLeft,
                                  right: [...nextRight, assignmentResponse.assignment.id],
                              };

                    void onSectionLayoutSync?.(nextPlacement);
                    return nextPlacement;
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

                await onActionLog?.({
                    action: "metafield_created",
                    payload: {
                        assignmentId: assignmentResponse.assignment.id,
                        definitionId: definitionResponse.definition.id,
                        name: candidateName,
                        kind,
                        targetColumn,
                    },
                });
            } catch (createError) {
                const message = toFriendlyError(
                    createError,
                    "Failed to create metafield.",
                );
                setError(message);
                showToast({
                    id: "metafield-create",
                    variant: "error",
                    title: "Metafield creation failed",
                    description: message,
                    durationMs: 6000,
                });
            }
        },
        [
            character.id,
            metafieldDefinitions,
            onActionLog,
            onAssignMetafieldToEntity,
            onCreateOrReuseMetafieldDefinition,
            onSaveMetafieldValue,
            onSectionLayoutSync,
            projectId,
            toFriendlyError,
        ],
    );

    const buildAddSectionOptions = React.useCallback(
        (targetColumn: CharacterColumnId) => {
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

    const handleSectionDragEnd = React.useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) {
            return;
        }

        const activeId = String(active.id);
        const overId = String(over.id);

        let nextPlacement: CharacterSectionPlacement | null = null;
        let movedEvent:
            | {
                  sourceColumn: CharacterColumnId;
                  targetColumn: CharacterColumnId;
                  oldIndex: number;
                  newIndex: number;
              }
            | null = null;

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
                movedEvent = {
                    sourceColumn,
                    targetColumn,
                    oldIndex,
                    newIndex,
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
            movedEvent = {
                sourceColumn,
                targetColumn,
                oldIndex: current[sourceColumn].indexOf(activeId),
                newIndex: targetIndex < 0 ? targetItems.length - 1 : targetIndex,
            };
            return nextPlacement;
        });

        if (!nextPlacement || !movedEvent) {
            return;
        }

        const action =
            movedEvent.sourceColumn === movedEvent.targetColumn
                ? "section_reordered"
                : "section_moved";

        const movedKind = isCharacterSectionId(activeId)
            ? "section"
            : "metafield";

        void onActionLog?.({
            action: `${movedKind}_${action === "section_reordered" ? "reordered" : "moved"}`,
            payload: {
                itemId: activeId,
                sourceColumn: movedEvent.sourceColumn,
                targetColumn: movedEvent.targetColumn,
                oldIndex: movedEvent.oldIndex,
                newIndex: movedEvent.newIndex,
                targetRef: overId,
            },
        });

        const orderedMetafieldIds = [...nextPlacement.left, ...nextPlacement.right].filter(
            (id) => isMetafieldItemId(id, metafieldAssignments),
        );

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
                    id: "metafield-reorder-sync",
                    variant: "error",
                    title: "Metafield reorder sync failed",
                    description: message,
                    durationMs: 6000,
                });
            }
        })();

        void onSectionLayoutSync?.(nextPlacement);
    }, [
        metafieldAssignments,
        onActionLog,
        onSaveMetafieldValue,
        onSectionLayoutSync,
    ]);

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
                metafieldAssignments.map((assignment) => [
                    assignment.id,
                    assignment,
                ]),
            ),
        [metafieldAssignments],
    );

    const renderSection = React.useCallback(
        (itemId: string) => {
            if (!isCharacterSectionId(itemId)) {
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
                        entityType="character"
                        entityId={character.id}
                        definitions={metafieldDefinitions}
                        assignments={[assignment]}
                        characterOptions={allCharacters.map((item) => ({
                            id: item.id,
                            label: item.name || "Untitled character",
                        }))}
                        locationOptions={locationOptions}
                        organizationOptions={organizationOptions}
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
                        onAction={(entry) => {
                            if (entry.type === "metafield_value_changed") {
                                return;
                            }

                            void onActionLog?.({
                                action: `metafield_${entry.type}`,
                                payload: {
                                    assignmentId: entry.assignmentId,
                                    definitionId: entry.definitionId,
                                    metafieldName: definition.name,
                                    ...entry.payload,
                                },
                            });
                        }}
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
                            <RichTextAreaInput
                                id="character-description"
                                value={values.description}
                                onChange={(val) =>
                                    handleChange("description", val)
                                }
                                rows={4}
                                placeholder="Physical appearance, demeanor, etc. (use / to reference)"
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
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
                                        No portrait yet
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
                                            label: "Import image",
                                            onClick: () => {
                                                triggerFilePick();
                                                void onActionLog?.({
                                                    action: "portrait_imported",
                                                });
                                            },
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Generate",
                                            onClick: handleGenerate,
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
                                            label: character.bgmId
                                                ? "Regenerate"
                                                : "Generate",
                                            onClick: async () => {
                                                await handleAssetAction(
                                                    onGenerateSong,
                                                    "Song generation failed",
                                                    "generation-audio",
                                                    "generation-audio",
                                                    "Audio generation failed",
                                                );
                                                await onActionLog?.({
                                                    action: "song_generated",
                                                });
                                            },
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import",
                                            onClick: () => {
                                                triggerSongPick();
                                                void onActionLog?.({
                                                    action: "song_imported",
                                                });
                                            },
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
                                            label: character.playlistId
                                                ? "Regenerate"
                                                : "Generate",
                                            onClick: async () => {
                                                await handleAssetAction(
                                                    onGeneratePlaylist,
                                                    "Playlist generation failed",
                                                    "generation-playlist",
                                                    "generation-playlist",
                                                    "Playlist generation failed",
                                                );
                                                await onActionLog?.({
                                                    action: "playlist_generated",
                                                });
                                            },
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import",
                                            onClick: () => {
                                                triggerPlaylistPick();
                                                void onActionLog?.({
                                                    action: "playlist_imported",
                                                });
                                            },
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

            if (sectionId === "currentLocation") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-field">
                            <SearchableSelect
                                value={values.currentLocationId}
                                options={locationOptions}
                                onChange={(locationId) =>
                                    handleChange(
                                        "currentLocationId",
                                        locationId,
                                    )
                                }
                                placeholder="Search locations..."
                                emptyLabel="Unassigned"
                            />
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "originLocation") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-field">
                            <SearchableSelect
                                value={values.backgroundLocationId}
                                options={locationOptions}
                                onChange={(locationId) =>
                                    handleChange(
                                        "backgroundLocationId",
                                        locationId,
                                    )
                                }
                                placeholder="Search locations..."
                                emptyLabel="Unassigned"
                            />
                        </div>
                    </SortableSectionCard>
                );
            }

            if (sectionId === "organization") {
                return (
                    <SortableSectionCard
                        key={sectionId}
                        id={sectionId}
                        title={SECTION_TITLE[sectionId]}
                    >
                        <div className="entity-field">
                            <SearchableSelect
                                value={values.organizationId}
                                options={organizationOptions}
                                onChange={(orgId) =>
                                    handleChange("organizationId", orgId)
                                }
                                placeholder="Search organizations..."
                                emptyLabel="Unassigned"
                            />
                        </div>
                    </SortableSectionCard>
                );
            }

            return null;
        },
        [
            allCharacters,
            assetBusy,
            canCycleGallery,
            character,
            currentImageIndex,
            gallerySources,
            handleAssetAction,
            imageOptions,
            locationOptions,
            metafieldAssignmentsById,
            metafieldDefinitionsById,
            metafieldDefinitions,
            onAssignMetafieldToEntity,
            onCreateOrReuseMetafieldDefinition,
            onDeleteMetafieldDefinitionGlobal,
            onGeneratePlaylist,
            onGenerateSong,
            onImportMetafieldImage,
            onNavigateToDocument,
            onRemoveMetafieldFromEntity,
            onSaveMetafieldValue,
            organizationOptions,
            portraitUrl,
            projectId,
            showNextImage,
            showPreviousImage,
            songUrl,
            triggerFilePick,
            triggerPlaylistPick,
            triggerSongPick,
            values.backgroundLocationId,
            values.currentLocationId,
            values.description,
            values.organizationId,
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
                                <p className="panel-label">Character</p>
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    className="entity-name-input"
                                    value={values.name}
                                    onChange={(e) =>
                                        handleChange("name", e.target.value)
                                    }
                                    placeholder="Untitled Character"
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
                                        {sectionPlacement.left.map(
                                            renderSection,
                                        )}
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
                                        {sectionPlacement.right.map(
                                            renderSection,
                                        )}
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
                {error ? (
                    <span className="card-hint is-error">{error}</span>
                ) : null}
            </form>
        </div>
    );
};
