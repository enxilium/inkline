import React from "react";

import type {
    WorkspaceCharacter,
    WorkspaceEditorTemplate,
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
    MoreVerticalIcon,
} from "../ui/Icons";
import type { DocumentRef } from "../ui/ListInput";
import { showToast } from "../ui/GenerationProgressToast";
import { MetafieldsSection } from "./MetafieldsSection";
import { ParagraphRichField } from "./ParagraphRichField";
import {
    normalizeUserFacingError,
    type UserErrorContext,
} from "../../utils/userFacingError";

export type RichEditorColumnId = "left" | "right";

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
const TEMPLATE_CORE_PREFIX = "template-core:";

const TEMPLATE_CORE_TYPE_BY_EDITOR: Record<
    RichEditorProps<RichEditorBaseValues>["entityType"],
    Record<string, { source: "core" | "default" | "custom"; type: string }>
> = {
    character: {
        description: { source: "core", type: "description" },
        portrait: { source: "core", type: "portrait" },
        audio: { source: "core", type: "audio" },
        "related-locations": { source: "default", type: "relatedLocations" },
        "related-organizations": {
            source: "default",
            type: "relatedOrganizations",
        },
    },
    location: {
        description: { source: "core", type: "description" },
        portrait: { source: "core", type: "portrait" },
        audio: { source: "core", type: "audio" },
        presence: { source: "custom", type: "presence" },
    },
    organization: {
        description: { source: "core", type: "description" },
        portrait: { source: "core", type: "portrait" },
        audio: { source: "core", type: "audio" },
        "related-locations": { source: "default", type: "locations" },
        reach: { source: "custom", type: "reach" },
    },
};

const TEMPLATE_CORE_TOKEN_ALIASES_BY_EDITOR: Record<
    RichEditorProps<RichEditorBaseValues>["entityType"],
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

type InternalCardDefinition<TValues extends RichEditorBaseValues> = {
    id: string;
    title: string;
    type: string;
    source: "core" | "default" | "custom";
    render?: (context: RichEditorRenderContext<TValues>) => React.ReactNode;
};

type SortableSectionCardProps = {
    title: string;
    children: React.ReactNode;
    className?: string;
};

const SortableSectionCard: React.FC<SortableSectionCardProps> = ({
    title,
    children,
    className,
}) => {
    return (
        <section
            className={`entity-section-card${className ? ` ${className}` : ""}`}
        >
            <div className="entity-section-card-header">
                <p className="panel-label">{title}</p>
                <div className="entity-section-card-actions" />
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
    defaultRightCardTypes?: string[];
    customRightCardTypes?: string[];
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
    galleryImageIds: string[];
    gallerySources: string[];
    songUrl?: string;
    availableDocuments?: DocumentRef[];
    onNavigateToDocument?: (ref: DocumentRef) => void;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onDeletePortrait: (imageId: string) => Promise<void>;
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
        selectOptions?: Array<
            | string
            | {
                  label: string;
                  icon?: string | null;
              }
        >;
    }) => Promise<{ definition: WorkspaceMetafieldDefinition }>;
    onSaveMetafieldSelectOptions: (request: {
        definitionId: string;
        options: Array<{ id?: string; label: string; icon?: string | null }>;
    }) => Promise<{
        definitionId: string;
        options: Array<{ id: string; label: string; icon?: string }>;
    }>;
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
    editorTemplate?: WorkspaceEditorTemplate | null;
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
    defaultRightCardTypes = [],
    customRightCardTypes = [],
    customCards = [],
    renderDefaultCard,
    onSubmit,
    allCharacters,
    allLocations,
    allOrganizations,
    metafieldDefinitions,
    metafieldAssignments,
    imageOptions,
    galleryImageIds,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onNavigateToDocument,
    onGeneratePortrait,
    onImportPortrait,
    onDeletePortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
    onCreateOrReuseMetafieldDefinition,
    onSaveMetafieldSelectOptions,
    onAssignMetafieldToEntity,
    onSaveMetafieldValue,
    onRemoveMetafieldFromEntity,
    onDeleteMetafieldDefinitionGlobal,
    onImportMetafieldImage,
    editorTemplate,
    focusTitleOnMount = false,
    initialSectionPlacement,
    onSectionLayoutSync,
    onActionLog,
    onDirtyStateChange,
    assetText,
}: RichEditorProps<TValues>) {
        const defaultRightCardTypeSet = React.useMemo(
            () => new Set(defaultRightCardTypes),
            [defaultRightCardTypes],
        );

        const customRightCardTypeSet = React.useMemo(
            () => new Set(customRightCardTypes),
            [customRightCardTypes],
        );

    const assetCopy = React.useMemo(
        () => ({ ...DEFAULT_ASSET_TEXT, ...assetText }),
        [assetText],
    );

    const [values, setValues] = React.useState<TValues>(initialValues);
    const [error, setError] = React.useState<string | null>(null);
    const [assetBusy, setAssetBusy] = React.useState(false);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const [pendingDeletePortraitId, setPendingDeletePortraitId] =
        React.useState<string | null>(null);
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

            if (
                card.source === "default" &&
                defaultRightCardTypeSet.has(card.type)
            ) {
                right.push(card.id);
                return;
            }

            if (
                card.source === "custom" &&
                customRightCardTypeSet.has(card.type)
            ) {
                right.push(card.id);
                return;
            }

            left.push(card.id);
        });

        return { left, right };
    }, [customRightCardTypeSet, defaultRightCardTypeSet, internalCards]);

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
            setPendingDeletePortraitId(null);
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
        if (!editorTemplate || editorTemplate.editorType !== entityType) {
            return;
        }

        const assignmentByDefinitionId = new Map(
            metafieldAssignments.map((assignment) => [
                assignment.definitionId,
                assignment.id,
            ]),
        );

        const templateCoreToInternalId = new Map(
            internalCards
                .filter((card) => card.source === "core")
                .map((card) => [card.type, card.id]),
        );
        const defaultTypeToInternalId = new Map(
            internalCards
                .filter((card) => card.source === "default")
                .map((card) => [card.type, card.id]),
        );
        const customTypeToInternalId = new Map(
            internalCards
                .filter((card) => card.source === "custom")
                .map((card) => [card.type, card.id]),
        );

        const resolveTemplatePlacementId = (placementId: string): string | null => {
            if (!placementId.startsWith(TEMPLATE_CORE_PREFIX)) {
                return assignmentByDefinitionId.get(placementId) ?? null;
            }

            const rawToken = placementId.slice(TEMPLATE_CORE_PREFIX.length);
            const token =
                TEMPLATE_CORE_TOKEN_ALIASES_BY_EDITOR[entityType][rawToken] ??
                rawToken;
            const mapping = TEMPLATE_CORE_TYPE_BY_EDITOR[entityType][token];
            if (!mapping) {
                return null;
            }

            if (mapping.source === "core") {
                return templateCoreToInternalId.get(mapping.type) ?? null;
            }
            if (mapping.source === "default") {
                return defaultTypeToInternalId.get(mapping.type) ?? null;
            }

            return customTypeToInternalId.get(mapping.type) ?? null;
        };

        const dedupeOrderedIds = (ids: Array<string | null>): string[] => {
            const seen = new Set<string>();
            const result: string[] = [];

            for (const id of ids) {
                if (!id || seen.has(id)) {
                    continue;
                }
                seen.add(id);
                result.push(id);
            }

            return result;
        };

        const nextTemplateLeft = dedupeOrderedIds(
            editorTemplate.placement.left.map(resolveTemplatePlacementId),
        );
        const nextTemplateRight = dedupeOrderedIds(
            editorTemplate.placement.right.map(resolveTemplatePlacementId),
        );

        const fixedCardIdSet = new Set(internalCards.map((card) => card.id));
        const hasTemplateFixedPlacement =
            nextTemplateLeft.some((id) => fixedCardIdSet.has(id)) ||
            nextTemplateRight.some((id) => fixedCardIdSet.has(id));

        const placedTemplateIds = new Set([
            ...nextTemplateLeft,
            ...nextTemplateRight,
        ]);
        const remainingAssignments = [...metafieldAssignments]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((assignment) => assignment.id)
            .filter((assignmentId) => !placedTemplateIds.has(assignmentId));

        let nextLeft: string[];
        let nextRight: string[];

        if (hasTemplateFixedPlacement) {
            const missingDefaultLeft = defaultPlacement.left.filter(
                (id) => !placedTemplateIds.has(id),
            );
            const missingDefaultRight = defaultPlacement.right.filter(
                (id) => !placedTemplateIds.has(id),
            );

            nextLeft = [...nextTemplateLeft, ...missingDefaultLeft, ...remainingAssignments];
            nextRight = [...nextTemplateRight, ...missingDefaultRight];
        } else {
            nextLeft = [...defaultPlacement.left, ...nextTemplateLeft, ...remainingAssignments];
            nextRight = [...defaultPlacement.right, ...nextTemplateRight];
        }

        const nextPlacement: RichEditorSectionPlacement = {
            left: nextLeft,
            right: nextRight,
        };

        setSectionPlacement((current) => {
            const isSameLeft =
                current.left.length === nextPlacement.left.length &&
                current.left.every((id, index) => id === nextPlacement.left[index]);
            const isSameRight =
                current.right.length === nextPlacement.right.length &&
                current.right.every(
                    (id, index) => id === nextPlacement.right[index],
                );

            if (isSameLeft && isSameRight) {
                return current;
            }

            return nextPlacement;
        });
    }, [
        defaultPlacement.left,
        defaultPlacement.right,
        editorTemplate,
        entityType,
        internalCards,
        metafieldAssignments,
    ]);

    React.useEffect(() => {
        const assignmentIds = [
            ...metafieldAssignments.map((assignment) => assignment.id),
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

                if (
                    card &&
                    card.source === "default" &&
                    defaultRightCardTypeSet.has(card.type)
                ) {
                    missingRight.push(id);
                    continue;
                }

                if (
                    card &&
                    card.source === "custom" &&
                    customRightCardTypeSet.has(card.type)
                ) {
                    missingRight.push(id);
                    continue;
                }

                missingLeft.push(id);
            }

            for (const id of missingAssignments) {
                missingLeft.push(id);
            }

            return {
                left: [...filteredLeft, ...missingLeft],
                right: [...filteredRight, ...missingRight],
            };
        });
    }, [
        customRightCardTypeSet,
        defaultRightCardTypeSet,
        internalCards,
        metafieldAssignments,
    ]);

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
    const currentPortraitImageId = galleryImageIds[currentImageIndex];
    const portraitUrl = gallerySources[currentImageIndex];

    const handleRequestDeletePortraitAction = React.useCallback(() => {
        if (!currentPortraitImageId || assetBusy) {
            return;
        }

        setPendingDeletePortraitId(currentPortraitImageId);
    }, [assetBusy, currentPortraitImageId]);

    const handleConfirmDeletePortrait = React.useCallback(async () => {
        if (!pendingDeletePortraitId || assetBusy) {
            return;
        }

        setAssetBusy(true);
        setError(null);
        try {
            await onDeletePortrait(pendingDeletePortraitId);
            setPendingDeletePortraitId(null);
        } catch (deleteError) {
            setError(
                toFriendlyError(
                    deleteError,
                    "Failed to delete portrait.",
                    "generation-image",
                ),
            );
        } finally {
            setAssetBusy(false);
        }
    }, [assetBusy, onDeletePortrait, pendingDeletePortraitId, toFriendlyError]);

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
                        <ParagraphRichField
                            syncSourceKey={`${entityType}:${entityId}:description`}
                            id={`${entityType}-description`}
                            value={values.description}
                            rows={4}
                            placeholder="Describe this entity... (use / to reference)"
                            onChange={(val) =>
                                handleChange(
                                    "description",
                                    val as TValues["description"],
                                )
                            }
                            availableDocuments={availableDocuments}
                            onNavigateToDocument={onNavigateToDocument}
                        />
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
                                <div className="portrait-toolbar-left">
                                    <ActionDropdown
                                        disabled={assetBusy}
                                        TriggerIcon={MoreVerticalIcon}
                                        menuAlign="left"
                                        options={[
                                            {
                                                label: "Delete image",
                                                onClick:
                                                    handleRequestDeletePortraitAction,
                                                disabled:
                                                    assetBusy ||
                                                    !currentPortraitImageId,
                                            },
                                        ]}
                                    />
                                </div>
                                <div className="portrait-toolbar-center">
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
                                </div>
                                <div className="portrait-toolbar-right">
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
                                </div>
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
                        title={fixedCard.title}
                    >
                        {content}
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
                        availableDocuments={availableDocuments}
                        onNavigateToDocument={onNavigateToDocument}
                        onCreateOrReuseDefinition={(request) =>
                            onCreateOrReuseMetafieldDefinition({
                                ...request,
                                projectId,
                            })
                        }
                        onSaveDefinitionSelectOptions={
                            onSaveMetafieldSelectOptions
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
            currentPortraitImageId,
            gallerySources,
            handleAssetAction,
            handleChange,
            handleRequestDeletePortraitAction,
            imageOptions,
            internalCardById,
            metafieldAssignments,
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
        <>
            <div className="entity-editor-panel">
                <form className="entity-editor" onSubmit={handleSubmit}>
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
                            <div className="entity-column-dropzone">
                                <div className="entity-column entity-column--sortable">
                                    {sectionPlacement.left.map(renderSection)}
                                </div>
                            </div>
                        </div>
                        <div className="entity-column-shell entity-column-shell--rhs">
                            <div className="entity-column-dropzone">
                                <div className="entity-column entity-column--sortable">
                                    {sectionPlacement.right.map(renderSection)}
                                </div>
                            </div>
                        </div>
                    </div>
                    {error ? (
                        <span className="card-hint is-error">{error}</span>
                    ) : null}
                </form>
            </div>
            <Dialog
                open={Boolean(pendingDeletePortraitId)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen && !assetBusy) {
                        setPendingDeletePortraitId(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Current Image?</DialogTitle>
                        <DialogDescription>
                            This will permanently delete the current portrait image
                            from this entity.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setPendingDeletePortraitId(null)}
                            disabled={assetBusy}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={() => {
                                void handleConfirmDeletePortrait();
                            }}
                            disabled={assetBusy}
                        >
                            Delete image
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
