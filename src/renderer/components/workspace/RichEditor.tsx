import React from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    useDroppable,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    rectSortingStrategy,
    useSortable,
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
import { Button } from "../ui/Button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/Dialog";
import {
    ChevronLeftIcon,
    ChevronRightIcon,
    GripVerticalIcon,
} from "../ui/Icons";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { RichTextAreaInput } from "../ui/RichTextAreaInput";
import type { DocumentRef } from "../ui/ListInput";
import { showToast } from "../ui/GenerationProgressToast";
import { MetafieldsSection } from "./MetafieldsSection";
import {
    normalizeUserFacingError,
    type UserErrorContext,
} from "../../utils/userFacingError";

type NewMetafieldKind = "field" | "paragraph" | "select";
export type RichEditorColumnId = "left" | "right";

type OptimisticMetafieldCard = {
    tempAssignmentId: string;
    name: string;
    kind: NewMetafieldKind;
    targetColumn: RichEditorColumnId;
};

export type RichEditorSectionPlacement = {
    left: string[];
    right: string[];
};

export type RichEditorActionLog = {
    action: string;
    payload?: Record<string, unknown>;
};

export type RichEditorBaseValues = {
    name: string;
    description: string;
};

export type RichEditorCardConfig = {
    title: string;
    type: string;
};

export type RichEditorCustomCard<TValues extends RichEditorBaseValues> = {
    title: string;
    type: string;
    render: (context: RichEditorRenderContext<TValues>) => React.ReactNode;
};

export type RichEditorAssetText = {
    noImageLabel: string;
    generateImageLabel: string;
    imageImportLabel: string;
    imageGenerateError: string;
    imageGenerateErrorTitle: string;
    soundtrackLabel: string;
    soundtrackGenerateLabel: string;
    soundtrackRegenerateLabel: string;
    soundtrackImportLabel: string;
    soundtrackGenerateError: string;
    soundtrackGenerateErrorTitle: string;
    playlistLabel: string;
    playlistGenerateLabel: string;
    playlistRegenerateLabel: string;
    playlistImportLabel: string;
    playlistGenerateError: string;
    playlistGenerateErrorTitle: string;
    imageImportError: string;
    songImportError: string;
    playlistImportError: string;
};

const DEFAULT_ASSET_TEXT: RichEditorAssetText = {
    noImageLabel: "No image yet",
    generateImageLabel: "Generate image",
    imageImportLabel: "Import image",
    imageGenerateError: "Failed to generate image.",
    imageGenerateErrorTitle: "Image generation failed",
    soundtrackLabel: "Soundtrack",
    soundtrackGenerateLabel: "Generate",
    soundtrackRegenerateLabel: "Regenerate",
    soundtrackImportLabel: "Import",
    soundtrackGenerateError: "Song generation failed",
    soundtrackGenerateErrorTitle: "Audio generation failed",
    playlistLabel: "Playlist",
    playlistGenerateLabel: "Generate",
    playlistRegenerateLabel: "Regenerate",
    playlistImportLabel: "Import",
    playlistGenerateError: "Playlist generation failed",
    playlistGenerateErrorTitle: "Playlist generation failed",
    imageImportError: "Failed to import image.",
    songImportError: "Failed to import song.",
    playlistImportError: "Failed to import playlist.",
};

const CORE_CARD_CONFIG: RichEditorCardConfig[] = [
    { title: "Description", type: "description" },
    { title: "Portrait", type: "portrait" },
    { title: "Audio Assets", type: "audio" },
];

const CORE_RIGHT_CARD_TYPES = new Set(["portrait", "audio"]);

type InternalCardDefinition<TValues extends RichEditorBaseValues> = {
    id: string;
    title: string;
    type: string;
    source: "core" | "default" | "custom";
    render?: (context: RichEditorRenderContext<TValues>) => React.ReactNode;
};

type SortableSectionCardProps = {
    id: string;
    title: string;
    children: React.ReactNode;
    className?: string;
    disableDrag?: boolean;
    isActiveDrag?: boolean;
    dragDimensions?: { width: number; height: number } | null;
};

const SortableSectionCard: React.FC<SortableSectionCardProps> = ({
    id,
    title,
    children,
    className,
    disableDrag = false,
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
                <h3 className="entity-section-card-title">{title}</h3>
                <button
                    type="button"
                    className="entity-section-card-handle"
                    aria-label={`Reorder ${title} section`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVerticalIcon size={14} />
                </button>
            </div>
            <div className="entity-section-card-body">{children}</div>
        </section>
    );
};

export type RichEditorRenderContext<TValues extends RichEditorBaseValues> = {
    values: TValues;
    setField: <K extends keyof TValues>(field: K, value: TValues[K]) => void;
    availableDocuments: DocumentRef[];
    onNavigateToDocument?: (ref: DocumentRef) => void;
};

export type RichEditorProps<TValues extends RichEditorBaseValues> = {
    panelLabel: string;
    projectId: string;
    entityType: "character" | "location" | "organization";
    entityId: string;
    initialValues: TValues;
    defaultCards: RichEditorCardConfig[];
    customCards?: RichEditorCustomCard<TValues>[];
    renderDefaultCard: (
        card: RichEditorCardConfig,
        context: RichEditorRenderContext<TValues>,
    ) => React.ReactNode;
    onSubmit: (values: TValues) => Promise<void>;
    allCharacters: WorkspaceCharacter[];
    allLocations: WorkspaceLocation[];
    allOrganizations: WorkspaceOrganization[];
    metafieldDefinitions: WorkspaceMetafieldDefinition[];
    metafieldAssignments: WorkspaceMetafieldAssignment[];
    imageOptions: { id: string; label: string }[];
    gallerySources: string[];
    songUrl?: string;
    availableDocuments?: DocumentRef[];
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
    initialSectionPlacement?: RichEditorSectionPlacement;
    onSectionLayoutSync?: (
        placement: RichEditorSectionPlacement,
    ) => Promise<void> | void;
    onActionLog?: (entry: RichEditorActionLog) => Promise<void> | void;
    onDirtyStateChange?: (isDirty: boolean) => void;
    assetText?: Partial<RichEditorAssetText>;
};

const normalizeTitle = (value: string): string =>
    value.trim().toLowerCase().replace(/\s+/g, " ");

const toInternalCardId = (
    source: InternalCardDefinition<RichEditorBaseValues>["source"],
    type: string,
    title: string,
    index: number,
): string =>
    `${source}:${type}:${title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}:${index}`;

const isMetafieldItemId = (
    value: string,
    assignments: WorkspaceMetafieldAssignment[],
): boolean => assignments.some((assignment) => assignment.id === value);

const findColumnForSection = (
    placement: RichEditorSectionPlacement,
    id: string,
): RichEditorColumnId | null => {
    if (placement.left.includes(id)) {
        return "left";
    }
    if (placement.right.includes(id)) {
        return "right";
    }
    if (id === "rich-editor-column-left") {
        return "left";
    }
    if (id === "rich-editor-column-right") {
        return "right";
    }
    return null;
};

const createOptimisticCardId = (): string =>
    `optimistic-metafield:${Date.now().toString(36)}:${Math.random()
        .toString(36)
        .slice(2, 10)}`;

const resolveMetafieldUiKind = (
    assignment: WorkspaceMetafieldAssignment,
    definition: WorkspaceMetafieldDefinition,
): "field" | "paragraph" | "select" => {
    const value = assignment.valueJson;
    if (
        value &&
        typeof value === "object" &&
        "kind" in value &&
        typeof (value as { kind?: unknown }).kind === "string"
    ) {
        const kind = (value as { kind: string }).kind;
        if (kind === "field" || kind === "paragraph" || kind === "select") {
            return kind;
        }
    }

    if (definition.valueType === "string[]") {
        return "select";
    }

    return "field";
};

export function RichEditor<TValues extends RichEditorBaseValues>({
    panelLabel,
    projectId,
    entityType,
    entityId,
    initialValues,
    defaultCards,
    customCards = [],
    renderDefaultCard,
    onSubmit,
    allCharacters,
    allLocations,
    allOrganizations,
    metafieldDefinitions,
    metafieldAssignments,
    imageOptions,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onNavigateToDocument,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
    onCreateOrReuseMetafieldDefinition,
    onAssignMetafieldToEntity,
    onSaveMetafieldValue,
    onRemoveMetafieldFromEntity,
    onDeleteMetafieldDefinitionGlobal,
    onImportMetafieldImage,
    focusTitleOnMount = false,
    initialSectionPlacement,
    onSectionLayoutSync,
    onActionLog,
    onDirtyStateChange,
    assetText,
}: RichEditorProps<TValues>) {
    const assetCopy = React.useMemo(
        () => ({ ...DEFAULT_ASSET_TEXT, ...assetText }),
        [assetText],
    );

    const [values, setValues] = React.useState<TValues>(initialValues);
    const [error, setError] = React.useState<string | null>(null);
    const [assetBusy, setAssetBusy] = React.useState(false);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const [activeDragSectionId, setActiveDragSectionId] = React.useState<
        string | null
    >(null);
    const [dragPreviewDimensions, setDragPreviewDimensions] = React.useState<{
        width: number;
        height: number;
    } | null>(null);
    const [optimisticMetafields, setOptimisticMetafields] = React.useState<
        OptimisticMetafieldCard[]
    >([]);
    const [pendingMetafieldDraft, setPendingMetafieldDraft] = React.useState<{
        targetColumn: RichEditorColumnId;
        kind: NewMetafieldKind;
        name: string;
    } | null>(null);
    const [metafieldDraftError, setMetafieldDraftError] = React.useState<
        string | null
    >(null);
    const [isCreatingMetafield, setIsCreatingMetafield] = React.useState(false);
    const [sectionPlacement, setSectionPlacement] =
        React.useState<RichEditorSectionPlacement>(() => {
            const defs = CORE_CARD_CONFIG;
            const left = defs
                .filter((card) => !CORE_RIGHT_CARD_TYPES.has(card.type))
                .map((card, index) =>
                    toInternalCardId("core", card.type, card.title, index),
                );
            const right = defs
                .filter((card) => CORE_RIGHT_CARD_TYPES.has(card.type))
                .map((card, index) =>
                    toInternalCardId("core", card.type, card.title, index),
                );

            return (
                initialSectionPlacement ?? {
                    left,
                    right,
                }
            );
        });

    const titleInputRef = React.useRef<HTMLInputElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const songInputRef = React.useRef<HTMLInputElement>(null);
    const playlistInputRef = React.useRef<HTMLInputElement>(null);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const isUserChange = React.useRef(false);
    const dirtyStateRef = React.useRef(false);
    const previousEntityId = React.useRef(entityId);
    const pendingMetafieldColumnsRef = React.useRef<
        Map<string, RichEditorColumnId>
    >(new Map());

    const toFriendlyError = React.useCallback(
        (err: unknown, fallback: string, context?: UserErrorContext) =>
            normalizeUserFacingError(err, fallback, context),
        [],
    );

    const emitDirtyState = React.useCallback(
        (isDirty: boolean) => {
            if (dirtyStateRef.current === isDirty) {
                return;
            }

            dirtyStateRef.current = isDirty;
            onDirtyStateChange?.(isDirty);
        },
        [onDirtyStateChange],
    );

    const internalCards = React.useMemo<
        InternalCardDefinition<TValues>[]
    >(() => {
        const mergedCards: Array<{
            source: InternalCardDefinition<TValues>["source"];
            title: string;
            type: string;
            render?: (ctx: RichEditorRenderContext<TValues>) => React.ReactNode;
        }> = [];

        CORE_CARD_CONFIG.forEach((card) => {
            mergedCards.push({
                source: "core",
                title: card.title,
                type: card.type,
            });
        });

        defaultCards.forEach((card) => {
            mergedCards.push({
                source: "default",
                title: card.title,
                type: card.type,
            });
        });

        customCards.forEach((card) => {
            mergedCards.push({
                source: "custom",
                title: card.title,
                type: card.type,
                render: card.render,
            });
        });

        const usedTitles = new Set<string>();
        const uniqueCards: InternalCardDefinition<TValues>[] = [];

        mergedCards.forEach((card, index) => {
            const normalizedTitle = normalizeTitle(card.title);
            if (usedTitles.has(normalizedTitle)) {
                console.warn(
                    `[RichEditor] Duplicate card title ignored: ${card.title}`,
                );
                return;
            }
            usedTitles.add(normalizedTitle);

            uniqueCards.push({
                id: toInternalCardId(card.source, card.type, card.title, index),
                title: card.title,
                type: card.type,
                source: card.source,
                render: card.render,
            });
        });

        return uniqueCards;
    }, [customCards, defaultCards]);

    const internalCardById = React.useMemo(
        () => new Map(internalCards.map((card) => [card.id, card])),
        [internalCards],
    );

    const defaultPlacement = React.useMemo<RichEditorSectionPlacement>(() => {
        const left: string[] = [];
        const right: string[] = [];

        internalCards.forEach((card) => {
            if (
                card.source === "core" &&
                CORE_RIGHT_CARD_TYPES.has(card.type)
            ) {
                right.push(card.id);
                return;
            }
            left.push(card.id);
        });

        return { left, right };
    }, [internalCards]);

    React.useEffect(() => {
        const isEntitySwitch = previousEntityId.current !== entityId;
        previousEntityId.current = entityId;

        if (!isEntitySwitch) {
            return;
        }

        isUserChange.current = false;
        emitDirtyState(false);
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
        setValues(initialValues);
        setError(null);
        setOptimisticMetafields([]);
        setActiveDragSectionId(null);
        setDragPreviewDimensions(null);
        setSectionPlacement(initialSectionPlacement ?? defaultPlacement);
    }, [
        defaultPlacement,
        emitDirtyState,
        entityId,
        initialSectionPlacement,
        initialValues,
    ]);

    React.useEffect(
        () => () => {
            emitDirtyState(false);
        },
        [emitDirtyState],
    );

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
        const assignmentIds = [
            ...metafieldAssignments.map((assignment) => assignment.id),
            ...optimisticMetafields.map((card) => card.tempAssignmentId),
        ];
        const fixedIds = new Set(internalCards.map((card) => card.id));

        setSectionPlacement((current) => {
            const filteredLeft = current.left.filter(
                (id) => fixedIds.has(id) || assignmentIds.includes(id),
            );
            const filteredRight = current.right.filter(
                (id) => fixedIds.has(id) || assignmentIds.includes(id),
            );

            const present = new Set([...filteredLeft, ...filteredRight]);
            const missingFixed = [...fixedIds].filter((id) => !present.has(id));
            const missingAssignments = assignmentIds.filter(
                (id) => !present.has(id),
            );

            if (
                filteredLeft.length === current.left.length &&
                filteredRight.length === current.right.length &&
                missingFixed.length === 0 &&
                missingAssignments.length === 0
            ) {
                return current;
            }

            const missingLeft: string[] = [];
            const missingRight: string[] = [];

            for (const id of missingFixed) {
                const card = internalCardById.get(id);
                if (
                    card &&
                    card.source === "core" &&
                    CORE_RIGHT_CARD_TYPES.has(card.type)
                ) {
                    missingRight.push(id);
                    continue;
                }
                missingLeft.push(id);
            }

            for (const id of missingAssignments) {
                const pendingColumn =
                    pendingMetafieldColumnsRef.current.get(id);
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
    }, [internalCards, metafieldAssignments, optimisticMetafields]);

    const handleChange = React.useCallback(
        <K extends keyof TValues>(field: K, value: TValues[K]) => {
            isUserChange.current = true;
            emitDirtyState(true);
            setValues((prev) => ({
                ...prev,
                [field]: value,
            }));
        },
        [emitDirtyState],
    );

    const handleSubmit = React.useCallback(
        async (event?: React.FormEvent<HTMLFormElement>) => {
            if (event) {
                event.preventDefault();
            }
            setError(null);
            try {
                await onSubmit(values);
                isUserChange.current = false;
                emitDirtyState(false);
            } catch (submitError) {
                setError(toFriendlyError(submitError, "Failed to save."));
            }
        },
        [emitDirtyState, onSubmit, toFriendlyError, values],
    );

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
    }, [handleSubmit, values]);

    const renderContext = React.useMemo<RichEditorRenderContext<TValues>>(
        () => ({
            values,
            setField: handleChange,
            availableDocuments,
            onNavigateToDocument,
        }),
        [availableDocuments, handleChange, onNavigateToDocument, values],
    );

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

    const triggerFilePick = () => fileInputRef.current?.click();
    const triggerSongPick = () => songInputRef.current?.click();
    const triggerPlaylistPick = () => playlistInputRef.current?.click();

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAssetBusy(true);
        setError(null);
        try {
            await onImportPortrait(file);
        } catch (importError) {
            setError(toFriendlyError(importError, assetCopy.imageImportError));
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
            setError(toFriendlyError(importError, assetCopy.songImportError));
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
                toFriendlyError(importError, assetCopy.playlistImportError),
            );
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handleGeneratePortraitAction = async () => {
        setAssetBusy(true);
        setError(null);
        try {
            await onGeneratePortrait();
        } catch (generateError) {
            showToast({
                id: "generation-image",
                variant: "error",
                title: assetCopy.imageGenerateErrorTitle,
                description: toFriendlyError(
                    generateError,
                    assetCopy.imageGenerateError,
                    "generation-image",
                ),
                durationMs: 6000,
            });
        } finally {
            setAssetBusy(false);
        }
    };

    const canCycleGallery = gallerySources.length > 1;
    const portraitUrl = gallerySources[currentImageIndex];

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

    const createMetafieldInColumn = React.useCallback(
        async (
            targetColumn: RichEditorColumnId,
            kind: NewMetafieldKind,
            name: string,
        ): Promise<boolean> => {
            const candidateName = name.trim();
            if (!candidateName) {
                return false;
            }

            const tempAssignmentId = createOptimisticCardId();

            setOptimisticMetafields((current) => [
                ...current,
                {
                    tempAssignmentId,
                    name: candidateName,
                    kind,
                    targetColumn,
                },
            ]);

            setSectionPlacement((current) => {
                const nextLeft = current.left.filter(
                    (id) => id !== tempAssignmentId,
                );
                const nextRight = current.right.filter(
                    (id) => id !== tempAssignmentId,
                );

                return targetColumn === "left"
                    ? {
                          left: [...nextLeft, tempAssignmentId],
                          right: nextRight,
                      }
                    : {
                          left: nextLeft,
                          right: [...nextRight, tempAssignmentId],
                      };
            });

            try {
                const definitionResponse =
                    await onCreateOrReuseMetafieldDefinition({
                        projectId,
                        name: candidateName,
                        scope: entityType,
                        valueType: kind === "select" ? "string[]" : "string",
                    });

                const assignmentResponse = await onAssignMetafieldToEntity({
                    definitionId: definitionResponse.definition.id,
                    entityType,
                    entityId,
                });

                pendingMetafieldColumnsRef.current.set(
                    assignmentResponse.assignment.id,
                    targetColumn,
                );

                let nextPlacementToSync: RichEditorSectionPlacement | null =
                    null;

                setSectionPlacement((current) => {
                    const nextLeft = current.left.filter(
                        (id) =>
                            id !== assignmentResponse.assignment.id &&
                            id !== tempAssignmentId,
                    );
                    const nextRight = current.right.filter(
                        (id) =>
                            id !== assignmentResponse.assignment.id &&
                            id !== tempAssignmentId,
                    );

                    const nextPlacement =
                        targetColumn === "left"
                            ? {
                                  left: [
                                      ...nextLeft,
                                      assignmentResponse.assignment.id,
                                  ],
                                  right: nextRight,
                              }
                            : {
                                  left: nextLeft,
                                  right: [
                                      ...nextRight,
                                      assignmentResponse.assignment.id,
                                  ],
                              };

                    nextPlacementToSync = nextPlacement;
                    return nextPlacement;
                });

                setOptimisticMetafields((current) =>
                    current.filter(
                        (card) => card.tempAssignmentId !== tempAssignmentId,
                    ),
                );

                if (nextPlacementToSync) {
                    await onSectionLayoutSync?.(nextPlacementToSync);
                }

                const initialValue =
                    kind === "select"
                        ? { kind: "select", value: [] as string[] }
                        : { kind, value: "" };

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
                return true;
            } catch (createError) {
                setOptimisticMetafields((current) =>
                    current.filter(
                        (card) => card.tempAssignmentId !== tempAssignmentId,
                    ),
                );
                setSectionPlacement((current) => ({
                    left: current.left.filter((id) => id !== tempAssignmentId),
                    right: current.right.filter(
                        (id) => id !== tempAssignmentId,
                    ),
                }));
                const message = toFriendlyError(
                    createError,
                    "Failed to create metafield.",
                );
                setError(message);
                showToast({
                    id: `metafield-create-${entityType}`,
                    variant: "error",
                    title: "Metafield creation failed",
                    description: message,
                    durationMs: 6000,
                });
                return false;
            }
        },
        [
            entityId,
            entityType,
            metafieldDefinitions,
            onActionLog,
            onAssignMetafieldToEntity,
            onCreateOrReuseMetafieldDefinition,
            onSaveMetafieldValue,
            onSectionLayoutSync,
            toFriendlyError,
            projectId,
        ],
    );

    const getSuggestedMetafieldName = React.useCallback((): string => {
        const existingNames = new Set(
            metafieldDefinitions
                .filter(
                    (definition) =>
                        definition.scope === entityType &&
                        !definition.name.startsWith("_sys:"),
                )
                .map((definition) => definition.name.trim().toLowerCase()),
        );

        optimisticMetafields.forEach((card) => {
            existingNames.add(card.name.trim().toLowerCase());
        });

        let candidateIndex = Math.max(1, existingNames.size + 1);
        let candidateName = `Metafield ${candidateIndex}`;
        while (existingNames.has(candidateName.toLowerCase())) {
            candidateIndex += 1;
            candidateName = `Metafield ${candidateIndex}`;
        }

        return candidateName;
    }, [entityType, metafieldDefinitions, optimisticMetafields]);

    const openMetafieldNameDialog = React.useCallback(
        (targetColumn: RichEditorColumnId, kind: NewMetafieldKind): void => {
            setMetafieldDraftError(null);
            setPendingMetafieldDraft({
                targetColumn,
                kind,
                name: getSuggestedMetafieldName(),
            });
        },
        [getSuggestedMetafieldName],
    );

    const closeMetafieldNameDialog = React.useCallback((): void => {
        if (isCreatingMetafield) {
            return;
        }

        setPendingMetafieldDraft(null);
        setMetafieldDraftError(null);
    }, [isCreatingMetafield]);

    const confirmMetafieldCreation =
        React.useCallback(async (): Promise<void> => {
            if (!pendingMetafieldDraft || isCreatingMetafield) {
                return;
            }

            const name = pendingMetafieldDraft.name.trim();
            if (!name) {
                setMetafieldDraftError("Metafield name is required.");
                return;
            }

            setIsCreatingMetafield(true);
            setMetafieldDraftError(null);

            try {
                const created = await createMetafieldInColumn(
                    pendingMetafieldDraft.targetColumn,
                    pendingMetafieldDraft.kind,
                    name,
                );

                if (created) {
                    setPendingMetafieldDraft(null);
                }
            } finally {
                setIsCreatingMetafield(false);
            }
        }, [
            createMetafieldInColumn,
            isCreatingMetafield,
            pendingMetafieldDraft,
        ]);

    const buildAddSectionOptions = React.useCallback(
        (targetColumn: RichEditorColumnId) => [
            {
                label: "Add Field Metafield",
                onClick: () => {
                    openMetafieldNameDialog(targetColumn, "field");
                },
            },
            {
                label: "Add Paragraph Metafield",
                onClick: () => {
                    openMetafieldNameDialog(targetColumn, "paragraph");
                },
            },
            {
                label: "Add Select Metafield",
                onClick: () => {
                    openMetafieldNameDialog(targetColumn, "select");
                },
            },
        ],
        [openMetafieldNameDialog],
    );

    const handleSectionDragStart = React.useCallback(
        (event: DragStartEvent) => {
            setActiveDragSectionId(String(event.active.id));

            const initialRect = event.active.rect.current.initial;
            if (
                initialRect &&
                initialRect.width > 0 &&
                initialRect.height > 0
            ) {
                setDragPreviewDimensions({
                    width: initialRect.width,
                    height: initialRect.height,
                });
                return;
            }

            setDragPreviewDimensions(null);
        },
        [],
    );

    const handleSectionDragEnd = React.useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            setActiveDragSectionId(null);
            setDragPreviewDimensions(null);
            if (!over) {
                return;
            }

            const activeId = String(active.id);
            const overId = String(over.id);
            let nextPlacement: RichEditorSectionPlacement | null = null;

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

                    const reordered = arrayMove(
                        sourceItems,
                        oldIndex,
                        newIndex,
                    );
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

            void onSectionLayoutSync?.(nextPlacement);

            void onActionLog?.({
                action: "section_moved",
                payload: {
                    activeId,
                    overId,
                },
            });

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
                        id: `metafield-reorder-sync-${entityType}`,
                        variant: "error",
                        title: "Metafield reorder sync failed",
                        description: message,
                        durationMs: 6000,
                    });
                }
            })();
        },
        [
            entityType,
            metafieldAssignments,
            onActionLog,
            onSaveMetafieldValue,
            onSectionLayoutSync,
            toFriendlyError,
        ],
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

    const handleSectionDragCancel = React.useCallback(() => {
        setActiveDragSectionId(null);
        setDragPreviewDimensions(null);
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const leftDroppable = useDroppable({ id: "rich-editor-column-left" });
    const rightDroppable = useDroppable({ id: "rich-editor-column-right" });

    const renderSection = React.useCallback(
        (itemId: string): React.ReactNode => {
            const fixedCard = internalCardById.get(itemId);
            if (fixedCard) {
                let content: React.ReactNode = null;

                if (
                    fixedCard.source === "core" &&
                    fixedCard.type === "description"
                ) {
                    content = (
                        <div className="entity-field">
                            <RichTextAreaInput
                                key={`${entityType}:${entityId}:description`}
                                id={`${entityType}-description`}
                                rows={4}
                                placeholder="Describe this entity... (use / to reference)"
                                value={values.description}
                                syncSourceKey={`${entityType}:${entityId}:description`}
                                onChange={(val) =>
                                    handleChange(
                                        "description",
                                        val as TValues["description"],
                                    )
                                }
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                    );
                } else if (
                    fixedCard.source === "core" &&
                    fixedCard.type === "portrait"
                ) {
                    content = (
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
                                        {assetCopy.noImageLabel}
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
                                            label: assetCopy.generateImageLabel,
                                            onClick:
                                                handleGeneratePortraitAction,
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: assetCopy.imageImportLabel,
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
                    );
                } else if (
                    fixedCard.source === "core" &&
                    fixedCard.type === "audio"
                ) {
                    content = (
                        <div className="entity-summary">
                            <div className="audio-asset-row">
                                <span className="audio-asset-label">
                                    {assetCopy.soundtrackLabel}
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
                                            label: songUrl
                                                ? assetCopy.soundtrackRegenerateLabel
                                                : assetCopy.soundtrackGenerateLabel,
                                            onClick: () =>
                                                void handleAssetAction(
                                                    onGenerateSong,
                                                    assetCopy.soundtrackGenerateError,
                                                    "generation-audio",
                                                    "generation-audio",
                                                    assetCopy.soundtrackGenerateErrorTitle,
                                                ),
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: assetCopy.soundtrackImportLabel,
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
                                    {assetCopy.playlistLabel}
                                </span>
                                <ActionDropdown
                                    disabled={assetBusy}
                                    options={[
                                        {
                                            label: songUrl
                                                ? assetCopy.playlistRegenerateLabel
                                                : assetCopy.playlistGenerateLabel,
                                            onClick: () =>
                                                void handleAssetAction(
                                                    onGeneratePlaylist,
                                                    assetCopy.playlistGenerateError,
                                                    "generation-playlist",
                                                    "generation-playlist",
                                                    assetCopy.playlistGenerateErrorTitle,
                                                ),
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: assetCopy.playlistImportLabel,
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
                    );
                } else if (fixedCard.source === "default") {
                    content = renderDefaultCard(
                        {
                            title: fixedCard.title,
                            type: fixedCard.type,
                        },
                        renderContext,
                    );
                } else if (fixedCard.source === "custom") {
                    content = fixedCard.render?.(renderContext) ?? null;
                }

                if (!content) {
                    return null;
                }

                return (
                    <SortableSectionCard
                        key={fixedCard.id}
                        id={fixedCard.id}
                        title={fixedCard.title}
                        isActiveDrag={activeDragSectionId === fixedCard.id}
                        dragDimensions={dragPreviewDimensions}
                    >
                        {content}
                    </SortableSectionCard>
                );
            }

            const optimisticCard = optimisticMetafields.find(
                (card) => card.tempAssignmentId === itemId,
            );

            if (optimisticCard) {
                return (
                    <SortableSectionCard
                        key={optimisticCard.tempAssignmentId}
                        id={optimisticCard.tempAssignmentId}
                        title={optimisticCard.name}
                        className={
                            optimisticCard.kind === "field"
                                ? "entity-section-card--half"
                                : "entity-section-card--full"
                        }
                        disableDrag
                        isActiveDrag={
                            activeDragSectionId ===
                            optimisticCard.tempAssignmentId
                        }
                        dragDimensions={dragPreviewDimensions}
                    >
                        <div className="entity-metafield-pending">
                            Creating metafield...
                        </div>
                    </SortableSectionCard>
                );
            }

            const assignment = metafieldAssignments.find(
                (item) => item.id === itemId,
            );
            if (!assignment) {
                return null;
            }

            const definition = metafieldDefinitions.find(
                (item) => item.id === assignment.definitionId,
            );
            if (!definition) {
                return null;
            }

            const uiKind = resolveMetafieldUiKind(assignment, definition);
            const metafieldSectionClassName =
                uiKind === "field"
                    ? "entity-metafield-section entity-metafield-section--half"
                    : "entity-metafield-section entity-metafield-section--full";

            return (
                <div key={itemId} className={metafieldSectionClassName}>
                    <MetafieldsSection
                        key={itemId}
                        projectId={projectId}
                        entityType={entityType}
                        entityId={entityId}
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
                        onAssignDefinition={onAssignMetafieldToEntity}
                        onSaveValue={onSaveMetafieldValue}
                        onUnassign={onRemoveMetafieldFromEntity}
                        onDeleteDefinitionGlobal={
                            onDeleteMetafieldDefinitionGlobal
                        }
                        onImportImage={onImportMetafieldImage}
                        hideControls
                        disableDnd
                    />
                </div>
            );
        },
        [
            allCharacters,
            allLocations,
            allOrganizations,
            assetBusy,
            assetCopy,
            availableDocuments,
            canCycleGallery,
            currentImageIndex,
            entityId,
            entityType,
            gallerySources,
            dragPreviewDimensions,
            handleAssetAction,
            handleChange,
            imageOptions,
            internalCardById,
            metafieldAssignments,
            metafieldDefinitions,
            optimisticMetafields,
            activeDragSectionId,
            onAssignMetafieldToEntity,
            onCreateOrReuseMetafieldDefinition,
            onDeleteMetafieldDefinitionGlobal,
            onGeneratePlaylist,
            onGenerateSong,
            onImportMetafieldImage,
            onNavigateToDocument,
            onRemoveMetafieldFromEntity,
            onSaveMetafieldValue,
            playlistInputRef,
            portraitUrl,
            projectId,
            renderContext,
            renderDefaultCard,
            showNextImage,
            showPreviousImage,
            songUrl,
            values.description,
        ],
    );

    return (
        <div className="entity-editor-panel">
            <form className="entity-editor" onSubmit={handleSubmit}>
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleSectionDragStart}
                    onDragOver={handleSectionDragOver}
                    onDragEnd={handleSectionDragEnd}
                    onDragCancel={handleSectionDragCancel}
                >
                    <div className="entity-editor-grid entity-editor-grid--balanced">
                        <div className="entity-header entity-header--lhs">
                            <div className="entity-header-title">
                                <p className="panel-label">{panelLabel}</p>
                                <input
                                    ref={titleInputRef}
                                    type="text"
                                    className="entity-name-input"
                                    value={values.name}
                                    onChange={(e) =>
                                        handleChange(
                                            "name",
                                            e.target.value as TValues["name"],
                                        )
                                    }
                                    placeholder={`Untitled ${panelLabel}`}
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
                                    strategy={rectSortingStrategy}
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
                                    strategy={rectSortingStrategy}
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
            <Dialog
                open={Boolean(pendingMetafieldDraft)}
                onOpenChange={(open) => {
                    if (!open) {
                        closeMetafieldNameDialog();
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Metafield</DialogTitle>
                        <DialogDescription>
                            Choose a name for the new metafield.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-form">
                        <div className="dialog-field">
                            <Label htmlFor="metafield-name">Name</Label>
                            <Input
                                id="metafield-name"
                                autoFocus
                                value={pendingMetafieldDraft?.name ?? ""}
                                onChange={(event) => {
                                    const nextName = event.target.value;
                                    setPendingMetafieldDraft((current) =>
                                        current
                                            ? {
                                                  ...current,
                                                  name: nextName,
                                              }
                                            : current,
                                    );
                                    if (metafieldDraftError) {
                                        setMetafieldDraftError(null);
                                    }
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        void confirmMetafieldCreation();
                                    }
                                }}
                                placeholder="Metafield name"
                                disabled={isCreatingMetafield}
                            />
                        </div>
                        {metafieldDraftError ? (
                            <span className="card-hint is-error">
                                {metafieldDraftError}
                            </span>
                        ) : null}
                        <div className="dialog-actions">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={closeMetafieldNameDialog}
                                disabled={isCreatingMetafield}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => {
                                    void confirmMetafieldCreation();
                                }}
                                disabled={
                                    isCreatingMetafield ||
                                    !(pendingMetafieldDraft?.name ?? "").trim()
                                }
                            >
                                {isCreatingMetafield
                                    ? "Creating..."
                                    : "Create Metafield"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
