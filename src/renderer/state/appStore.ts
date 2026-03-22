import { create } from "zustand";

import type { RendererApi } from "../../@interface-adapters/controllers/contracts";
import type { ConflictPayload } from "../../@interface-adapters/controllers/sync/SyncStateGateway";
import { showToast } from "../components/ui/GenerationProgressToast";
import { globalSearchEngine } from "./globalSearchEngine";
import type {
    GlobalFindAndReplaceRequest,
    GlobalFindAndReplaceResponse,
    GlobalFindRequest,
    GlobalFindResponse,
    SearchDocumentSnapshot,
} from "./globalSearchTypes";
import type {
    AppStage,
    AuthMode,
    ProjectSummary,
    RendererUser,
    ProjectsStatus,
    AutosaveStatus,
    ShortcutStates,
    OpenProjectPayload,
    WorkspaceDocumentRef,
    WorkspaceChapter,
    WorkspaceCharacter,
    WorkspaceLocation,
    WorkspaceOrganization,
    WorkspaceProject,
    WorkspaceScrapNote,
    WorkspaceAssets,
    WorkspaceAssetBundle,
    WorkspaceDocumentKind,
    WorkspaceImageAsset,
    WorkspaceBGMAsset,
    WorkspacePlaylistAsset,
    WorkspaceTimeline,
    WorkspaceEvent,
    WorkspaceViewMode,
    WorkspaceMetafieldDefinition,
    WorkspaceMetafieldAssignment,
    WorkspaceEditorTemplate,
    WorkspaceEditorTemplateType,
} from "../types";
import { normalizeUserFacingError } from "../utils/userFacingError";

const initialAuthForm = {
    email: "",
    password: "",
};

const defaultShortcutStates: ShortcutStates = {};

const defaultAutosaveStatus: AutosaveStatus = "idle";

const emptyAssets: WorkspaceAssets = {
    images: {},
    bgms: {},
    playlists: {},
};

const getRendererApi = (): RendererApi => {
    if (!window?.api) {
        throw new Error("Renderer bridge is unavailable.");
    }

    return window.api;
};

const getAuthEvents = (): Window["authEvents"] => {
    if (!window?.authEvents) {
        throw new Error("Auth events bridge is unavailable.");
    }

    return window.authEvents;
};

const getSyncEvents = (): Window["syncEvents"] => {
    if (!window?.syncEvents) {
        throw new Error("Sync events bridge is unavailable.");
    }

    return window.syncEvents;
};

const rendererApi = getRendererApi();
const authEvents = getAuthEvents();
const syncEvents = getSyncEvents();
let unsubscribeAuthState: (() => void) | null = null;
const unsubscribeSyncListeners: Array<() => void> = [];
const recentlyResolvedConflicts = new Map<string, number>();
const recentLocalMetafieldWrites = new Map<string, number>();
const acceptedConflictOverwrites = new Set<string>();
const submittedFailureFingerprints = new Set<string>();
const CONFLICT_SUPPRESSION_MS = 15000;
const LOCAL_METAFIELD_CONFLICT_SUPPRESSION_MS = 4000;

const getConflictKey = (
    entityType: ConflictPayload["entityType"],
    entityId: string,
) => `${entityType}:${entityId}`;

const getConflictEventKey = (payload: ConflictPayload): string =>
    `${payload.entityType}:${payload.entityId}:${payload.localUpdatedAt}:${payload.remoteUpdatedAt}`;

const getConflictEntityKey = (
    entityType: ConflictPayload["entityType"],
    entityId: string,
): string => `${entityType}:${entityId}`;

const markLocalMetafieldWrite = (assignmentId: string): void => {
    recentLocalMetafieldWrites.set(assignmentId, Date.now());
};

const markAcceptedConflictOverwrite = (
    entityType: ConflictPayload["entityType"],
    entityId: string,
): void => {
    acceptedConflictOverwrites.add(getConflictEntityKey(entityType, entityId));
};

const consumeAcceptedConflictOverwrite = (
    entityType: ConflictPayload["entityType"],
    entityId: string,
): boolean => {
    const key = getConflictEntityKey(entityType, entityId);
    if (!acceptedConflictOverwrites.has(key)) {
        return false;
    }

    acceptedConflictOverwrites.delete(key);
    return true;
};

const hasRecentLocalMetafieldWrite = (assignmentId: string): boolean => {
    const timestamp = recentLocalMetafieldWrites.get(assignmentId);
    if (!timestamp) {
        return false;
    }

    if (Date.now() - timestamp > LOCAL_METAFIELD_CONFLICT_SUPPRESSION_MS) {
        recentLocalMetafieldWrites.delete(assignmentId);
        return false;
    }

    return true;
};

const omitKey = <T extends Record<string, unknown>>(
    record: T,
    key: string,
): T => {
    const next = { ...record };
    delete next[key];
    return next;
};

const toWorkspaceDocumentKind = (
    entityType: ConflictPayload["entityType"],
): WorkspaceDocumentKind | null => {
    if (
        entityType === "chapter" ||
        entityType === "scrapNote" ||
        entityType === "character" ||
        entityType === "location" ||
        entityType === "organization"
    ) {
        return entityType;
    }

    return null;
};

const isOpenDocumentTarget = (
    activeDocument: WorkspaceDocumentRef | null,
    openTabs: WorkspaceDocumentRef[],
    kind: WorkspaceDocumentKind,
    id: string,
): boolean => {
    if (activeDocument?.kind === kind && activeDocument.id === id) {
        return true;
    }

    return openTabs.some((tab) => tab.kind === kind && tab.id === id);
};

const documentExistsInState = (
    state: Pick<
        AppStore,
        "chapters" | "characters" | "locations" | "organizations" | "scrapNotes"
    >,
    selection: WorkspaceDocumentRef,
): boolean => {
    if (selection.kind === "chapter") {
        return state.chapters.some((item) => item.id === selection.id);
    }
    if (selection.kind === "character") {
        return state.characters.some((item) => item.id === selection.id);
    }
    if (selection.kind === "location") {
        return state.locations.some((item) => item.id === selection.id);
    }
    if (selection.kind === "organization") {
        return state.organizations.some((item) => item.id === selection.id);
    }
    return state.scrapNotes.some((item) => item.id === selection.id);
};

const resolveAssetOwnerSelection = (
    state: Pick<
        AppStore,
        "chapters" | "characters" | "locations" | "organizations" | "scrapNotes"
    >,
    assetType: "image" | "bgm" | "playlist",
    assetId: string,
): WorkspaceDocumentRef | null => {
    // Fallback order mandated for asset conflicts.
    const chapter = state.chapters.find((item) => item.id === assetId);
    if (chapter) {
        return { kind: "chapter", id: chapter.id };
    }

    const character = state.characters.find((item) => {
        if (assetType === "image") {
            return (item.galleryImageIds ?? []).includes(assetId);
        }
        if (assetType === "bgm") {
            return item.bgmId === assetId;
        }
        return item.playlistId === assetId;
    });
    if (character) {
        return { kind: "character", id: character.id };
    }

    const location = state.locations.find((item) => {
        if (assetType === "image") {
            return (item.galleryImageIds ?? []).includes(assetId);
        }
        if (assetType === "bgm") {
            return item.bgmId === assetId;
        }
        return item.playlistId === assetId;
    });
    if (location) {
        return { kind: "location", id: location.id };
    }

    const organization = state.organizations.find((item) => {
        if (assetType === "image") {
            return (item.galleryImageIds ?? []).includes(assetId);
        }
        if (assetType === "bgm") {
            return item.bgmId === assetId;
        }
        return item.playlistId === assetId;
    });
    if (organization) {
        return { kind: "organization", id: organization.id };
    }

    const scrapNote = state.scrapNotes.find((item) => item.id === assetId);
    if (scrapNote) {
        return { kind: "scrapNote", id: scrapNote.id };
    }

    return null;
};

const resolveConflictSelection = (
    state: Pick<
        AppStore,
        | "chapters"
        | "characters"
        | "locations"
        | "organizations"
        | "scrapNotes"
        | "metafieldAssignments"
    >,
    conflict: ConflictPayload,
): WorkspaceDocumentRef | null => {
    const directKind = toWorkspaceDocumentKind(conflict.entityType);
    if (directKind) {
        return { kind: directKind, id: conflict.entityId };
    }

    if (conflict.entityType === "metafieldAssignment") {
        const assignment = state.metafieldAssignments.find(
            (item) => item.id === conflict.entityId,
        );
        if (
            assignment &&
            (assignment.entityType === "character" ||
                assignment.entityType === "location" ||
                assignment.entityType === "organization")
        ) {
            return { kind: assignment.entityType, id: assignment.entityId };
        }
        return null;
    }

    if (conflict.entityType === "metafieldDefinition") {
        const assignment = state.metafieldAssignments.find(
            (item) => item.definitionId === conflict.entityId,
        );
        if (
            assignment &&
            (assignment.entityType === "character" ||
                assignment.entityType === "location" ||
                assignment.entityType === "organization")
        ) {
            return { kind: assignment.entityType, id: assignment.entityId };
        }
        return null;
    }

    if (
        conflict.entityType === "image" ||
        conflict.entityType === "bgm" ||
        conflict.entityType === "playlist"
    ) {
        return resolveAssetOwnerSelection(
            state,
            conflict.entityType,
            conflict.entityId,
        );
    }

    return null;
};

const createErrorMessage = (error: unknown, fallback: string): string => {
    return normalizeUserFacingError(error, fallback);
};

const toWorkspaceDocumentKey = (selection: WorkspaceDocumentRef): string =>
    `${selection.kind}:${selection.id}`;

const generateOptimisticId = (): string => {
    // Electron renderer supports Web Crypto in modern versions.
    const cryptoRef = (globalThis as unknown as { crypto?: Crypto }).crypto;
    if (cryptoRef?.randomUUID) {
        return cryptoRef.randomUUID();
    }

    // Fallback: keep collision probability extremely low.
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const MAX_LOCATION_NESTING_LEVEL = 5;

const runInBackground = (
    promise: Promise<unknown>,
    onError: (error: unknown) => void,
): void => {
    promise.catch(onError);
};

const makeTemplateSeedValue = (
    kind: "field" | "paragraph" | "select",
): WorkspaceMetafieldAssignment["valueJson"] =>
    kind === "select"
        ? {
              kind,
              value: [] as string[],
          }
        : {
              kind,
              value: "",
          };

const documentExists = (
    payload: OpenProjectPayload,
    selection: WorkspaceDocumentRef | null,
): boolean => {
    if (!selection) {
        return false;
    }

    switch (selection.kind) {
        case "chapter":
            return payload.chapters.some((item) => item.id === selection.id);
        case "scrapNote":
            return payload.scrapNotes.some((item) => item.id === selection.id);
        case "character":
            return payload.characters.some((item) => item.id === selection.id);
        case "location":
            return payload.locations.some((item) => item.id === selection.id);
        case "organization":
            return payload.organizations.some(
                (item) => item.id === selection.id,
            );
        default:
            return false;
    }
};

const createDefaultSelection = (
    payload: OpenProjectPayload,
): WorkspaceDocumentRef | null => {
    if (payload.chapters.length) {
        return { kind: "chapter", id: payload.chapters[0].id };
    }
    if (payload.scrapNotes.length) {
        return { kind: "scrapNote", id: payload.scrapNotes[0].id };
    }
    if (payload.characters.length) {
        return { kind: "character", id: payload.characters[0].id };
    }
    if (payload.locations.length) {
        return { kind: "location", id: payload.locations[0].id };
    }
    if (payload.organizations.length) {
        return { kind: "organization", id: payload.organizations[0].id };
    }
    return null;
};

const resolveDocumentSelection = (
    payload: OpenProjectPayload,
    preferred?: WorkspaceDocumentRef | null,
): WorkspaceDocumentRef | null => {
    if (preferred && documentExists(payload, preferred)) {
        return preferred;
    }
    return createDefaultSelection(payload);
};

const findParentLocationId = (
    locationId: string,
    locations: WorkspaceLocation[],
): string | null => {
    for (const location of locations) {
        if (location.sublocationIds.includes(locationId)) {
            return location.id;
        }
    }

    return null;
};

const collectDescendantLocationIds = (
    rootLocationId: string,
    locations: WorkspaceLocation[],
): Set<string> => {
    const locationsById = new Map(
        locations.map((location) => [location.id, location]),
    );
    const descendants = new Set<string>();
    const stack = [rootLocationId];

    while (stack.length > 0) {
        const currentId = stack.pop();
        if (!currentId || descendants.has(currentId)) {
            continue;
        }

        descendants.add(currentId);
        const current = locationsById.get(currentId);
        if (!current) {
            continue;
        }

        current.sublocationIds.forEach((childId) => stack.push(childId));
    }

    return descendants;
};

const exceedsLocationNestingLimit = (
    projectLocationIds: string[],
    locations: WorkspaceLocation[],
    maxLevel: number,
): boolean => {
    const locationsById = new Map(
        locations.map((location) => [location.id, location]),
    );

    const childIds = new Set<string>();
    locations.forEach((location) => {
        location.sublocationIds.forEach((childId) => {
            if (locationsById.has(childId)) {
                childIds.add(childId);
            }
        });
    });

    const roots: string[] = [];
    projectLocationIds.forEach((id) => {
        if (locationsById.has(id) && !roots.includes(id)) {
            roots.push(id);
        }
    });

    locations.forEach((location) => {
        if (!roots.includes(location.id) && !childIds.has(location.id)) {
            roots.push(location.id);
        }
    });

    const visited = new Set<string>();
    const visit = (rootId: string): boolean => {
        const stack: Array<{ id: string; depth: number }> = [
            { id: rootId, depth: 0 },
        ];

        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) {
                continue;
            }

            const { id, depth } = current;
            if (visited.has(id)) {
                continue;
            }

            visited.add(id);
            if (depth + 1 > maxLevel) {
                return true;
            }

            const node = locationsById.get(id);
            if (!node) {
                continue;
            }

            node.sublocationIds.forEach((childId) => {
                if (locationsById.has(childId)) {
                    stack.push({ id: childId, depth: depth + 1 });
                }
            });
        }

        return false;
    };

    for (const rootId of roots) {
        if (visit(rootId)) {
            return true;
        }
    }

    for (const location of locations) {
        if (!visited.has(location.id) && visit(location.id)) {
            return true;
        }
    }

    return false;
};

const patchEntity = <T extends { id: string }>(
    list: T[],
    entityId: string,
    patch: Partial<T>,
): T[] =>
    list.map((entity) =>
        entity.id === entityId ? { ...entity, ...patch } : entity,
    );

const indexAssets = (bundle: WorkspaceAssetBundle): WorkspaceAssets => {
    const mapById = <T extends { id: string }>(items: T[]) =>
        items.reduce<Record<string, T>>((acc, item) => {
            acc[item.id] = item;
            return acc;
        }, {});

    return {
        images: mapById(bundle.images ?? []),
        bgms: mapById(bundle.bgms ?? []),
        playlists: mapById(bundle.playlists ?? []),
    };
};

type PendingChapterEditBase = {
    id: string;
    chapterId: string;
    kind: "comment" | "replacement";
    createdAt: number;
};

export type PendingChapterCommentEdit = PendingChapterEditBase & {
    kind: "comment";
    comment: string;
    wordNumberStart?: number;
    wordNumberEnd?: number;
    originalText?: string;
};

export type PendingChapterReplacementEdit = PendingChapterEditBase & {
    kind: "replacement";
    wordNumberStart: number;
    wordNumberEnd: number;
    originalText: string;
    replacementText: string;
    comment?: string;
};

export type PendingChapterEdit =
    | PendingChapterCommentEdit
    | PendingChapterReplacementEdit;

type AppStore = {
    stage: AppStage;
    previousStage: AppStage | null;
    authMode: AuthMode;
    authForm: typeof initialAuthForm;
    authError: string | null;
    isAuthSubmitting: boolean;
    user: RendererUser | null;
    currentUserId: string;
    projects: ProjectSummary[];
    projectCovers: Record<string, WorkspaceImageAsset>;
    projectsStatus: ProjectsStatus;
    projectsError: string | null;
    projectSelectionError: string | null;
    openingProjectId: string | null;
    isImporting: boolean;
    importProgress: number;
    activeProjectName: string;
    projectId: string;
    workspaceProject: WorkspaceProject | null;
    chapters: WorkspaceChapter[];
    characters: WorkspaceCharacter[];
    locations: WorkspaceLocation[];
    organizations: WorkspaceOrganization[];
    scrapNotes: WorkspaceScrapNote[];
    timelines: WorkspaceTimeline[];
    selectedTimelineId: string | null;
    events: WorkspaceEvent[];
    metafieldDefinitions: WorkspaceMetafieldDefinition[];
    metafieldAssignments: WorkspaceMetafieldAssignment[];
    editorTemplates: WorkspaceEditorTemplate[];
    assets: WorkspaceAssets;
    activeDocument: WorkspaceDocumentRef | null;
    openTabs: WorkspaceDocumentRef[];
    workspaceViewMode: WorkspaceViewMode;
    setWorkspaceViewMode: (mode: WorkspaceViewMode) => void;
    autosaveStatus: AutosaveStatus;
    autosaveError: string | null;
    cloudSyncError: string | null;
    syncStatus: "online" | "offline" | "syncing";
    lastSyncedAt: string | null;
    pendingConflict: {
        entityType: ConflictPayload["entityType"];
        entityId: string;
        projectId: string;
        entityName: string;
        localUpdatedAt: string;
        remoteUpdatedAt: string;
    } | null;
    pendingConflictQueue: ConflictPayload[];
    lastSavedAt: number | null;
    shortcutStates: ShortcutStates;
    draggedDocument: { id: string; kind: string; title: string } | null;
    isBinderOpen: boolean;
    isChatOpen: boolean;

    // Pending chapter edits (in-memory only)
    pendingEditsByChapterId: Record<
        string,
        {
            comments: PendingChapterCommentEdit[];
            replacements: PendingChapterReplacementEdit[];
        }
    >;
    pendingEditsById: Record<string, PendingChapterEdit>;
    archivedEditsById: Record<string, PendingChapterEdit>;
    dirtyDocumentEditors: Record<string, WorkspaceDocumentRef>;

    currentSelection: {
        text: string;
        range: string; // e.g. "Chapter 1 100-200"
    } | null;
    setCurrentSelection: (
        selection: { text: string; range: string } | null,
    ) => void;
    markDocumentEditorDirty: (selection: WorkspaceDocumentRef) => void;
    clearDocumentEditorDirty: (selection: WorkspaceDocumentRef) => void;

    addPendingEdits: (payload: {
        comments: {
            chapterId: string;
            comment: string;
            wordNumberStart?: number;
            wordNumberEnd?: number;
            originalText?: string;
        }[];
        replacements: {
            chapterId: string;
            wordNumberStart: number;
            wordNumberEnd: number;
            originalText: string;
            replacementText: string;
            comment?: string;
        }[];
    }) => void;
    hasPendingEdits: () => boolean;
    hasPendingEditsForChapter: (chapterId: string) => boolean;
    removePendingEdit: (editId: string) => void;
    archivePendingEdit: (editId: string) => void;
    restoreArchivedEdit: (editId: string) => void;
    clearPendingEditsForChapter: (chapterId: string) => void;
    openSettings: () => void;
    closeSettings: () => void;
    bootstrapSession: () => Promise<void>;
    setAuthField: (field: keyof typeof initialAuthForm, value: string) => void;
    setAuthMode: (mode: AuthMode) => void;
    toggleAuthMode: () => void;
    submitAuth: () => Promise<void>;
    requestPasswordReset: () => Promise<void>;
    loadProjects: (userId?: string) => Promise<void>;
    setProjectsError: (message: string | null) => void;
    createProject: (params: { title: string }) => Promise<void>;
    importProject: () => Promise<void>;
    openProject: (project: ProjectSummary) => Promise<void>;
    reloadActiveProject: () => Promise<void>;
    setProjectSelectionError: (message: string | null) => void;
    returnToProjects: () => Promise<void>;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    setActiveDocument: (selection: WorkspaceDocumentRef) => void;
    closeTab: (selection: WorkspaceDocumentRef) => void;
    reorderTabs: (newOrder: WorkspaceDocumentRef[]) => void;
    updateChapterLocally: (
        chapterId: string,
        patch: Partial<WorkspaceChapter>,
    ) => void;
    updateScrapNoteLocally: (
        scrapNoteId: string,
        patch: Partial<WorkspaceScrapNote>,
    ) => void;
    updateCharacterLocally: (
        characterId: string,
        patch: Partial<WorkspaceCharacter>,
    ) => void;
    updateLocationLocally: (
        locationId: string,
        patch: Partial<WorkspaceLocation>,
    ) => void;
    updateOrganizationLocally: (
        organizationId: string,
        patch: Partial<WorkspaceOrganization>,
    ) => void;
    addOrUpdateMetafieldDefinitionLocally: (
        definition: WorkspaceMetafieldDefinition,
    ) => void;
    addOrUpdateMetafieldAssignmentLocally: (
        assignment: WorkspaceMetafieldAssignment,
    ) => void;
    updateMetafieldAssignmentLocally: (
        assignmentId: string,
        patch: Partial<WorkspaceMetafieldAssignment>,
    ) => void;
    removeMetafieldAssignmentLocally: (assignmentId: string) => void;
    removeMetafieldDefinitionLocally: (definitionId: string) => void;
    getEditorTemplateForType: (
        editorType: WorkspaceEditorTemplateType,
    ) => WorkspaceEditorTemplate | null;
    reloadProjectTemplateData: (targetProjectId?: string) => Promise<void>;
    createChapterEntry: (order?: number) => Promise<void>;
    createScrapNoteEntry: () => Promise<void>;
    createCharacterEntry: () => Promise<void>;
    createLocationEntry: () => Promise<void>;
    createOrganizationEntry: () => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    renameProject: (projectId: string, title: string) => Promise<void>;
    deleteChapter: (chapterId: string) => Promise<void>;
    deleteScrapNote: (scrapNoteId: string) => Promise<void>;
    deleteCharacter: (characterId: string) => Promise<void>;
    deleteLocation: (locationId: string) => Promise<void>;
    deleteOrganization: (organizationId: string) => Promise<void>;
    reorderChapters: (newOrder: string[]) => Promise<void>;
    reorderScrapNotes: (newOrder: string[]) => Promise<void>;
    reorderCharacters: (newOrder: string[]) => Promise<void>;
    reorderLocations: (newOrder: string[]) => Promise<void>;
    moveLocationInTree: (params: {
        locationId: string;
        targetLocationId: string;
        dropMode: "before" | "inside" | "after";
    }) => Promise<void>;
    reorderOrganizations: (newOrder: string[]) => Promise<void>;
    renameDocument: (
        kind: string,
        id: string,
        newTitle: string,
    ) => Promise<void>;
    setAutosaveStatus: (status: AutosaveStatus) => void;
    setAutosaveError: (message: string | null) => void;
    setCloudSyncError: (message: string | null) => void;
    setSyncStatus: (status: "online" | "offline" | "syncing") => void;
    setLastSyncedAt: (timestamp: string | null) => void;
    setPendingConflict: (conflict: AppStore["pendingConflict"]) => void;
    resolveConflict: (
        resolution: "accept-remote" | "keep-local",
    ) => Promise<void>;
    setLastSavedAt: (timestamp: number | null) => void;
    setShortcutState: (id: string, state: ShortcutStates[string]) => void;
    resetShortcutState: (id: string) => void;
    setDraggedDocument: (
        doc: { id: string; kind: string; title: string } | null,
    ) => void;
    pendingTitleFocusDocument: WorkspaceDocumentRef | null;
    consumePendingTitleFocus: (selection: WorkspaceDocumentRef) => boolean;
    renamingDocument: { id: string; kind: string } | null;
    setRenamingDocument: (doc: { id: string; kind: string } | null) => void;
    closeProject: () => void;
    toggleBinder: () => void;
    toggleChat: () => void;
    flushActiveDocumentContent: () => Promise<void>;

    // IPC wrappers: keep renderer calls centralized here.
    exportManuscript: RendererApi["project"]["exportManuscript"];
    analyzeText: RendererApi["analysis"]["analyzeText"];
    editChapters: RendererApi["analysis"]["editChapters"];
    generalChat: RendererApi["analysis"]["generalChat"];
    loadChatHistory: RendererApi["analysis"]["loadChatHistory"];
    loadChatMessages: RendererApi["analysis"]["loadChatMessages"];
    saveChapterContent: RendererApi["logistics"]["saveChapterContent"];
    updateScrapNoteRemote: RendererApi["manuscript"]["updateScrapNote"];
    saveCharacterInfo: RendererApi["logistics"]["saveCharacterInfo"];
    saveLocationInfo: RendererApi["logistics"]["saveLocationInfo"];
    reorderLocationChildren: RendererApi["logistics"]["reorderLocationChildren"];
    saveOrganizationInfo: RendererApi["logistics"]["saveOrganizationInfo"];
    listProjectMetafields: RendererApi["metafield"]["listProjectMetafields"];
    createOrReuseMetafieldDefinition: RendererApi["metafield"]["createOrReuseMetafieldDefinition"];
    assignMetafieldToEntity: RendererApi["metafield"]["assignMetafieldToEntity"];
    saveMetafieldValue: RendererApi["metafield"]["saveMetafieldValue"];
    saveMetafieldSelectOptions: RendererApi["metafield"]["saveMetafieldSelectOptions"];
    saveEditorTemplate: RendererApi["metafield"]["saveEditorTemplate"];
    removeMetafieldFromEntity: RendererApi["metafield"]["removeMetafieldFromEntity"];
    deleteMetafieldDefinitionGlobal: RendererApi["metafield"]["deleteMetafieldDefinitionGlobal"];
    submitBugReport: RendererApi["support"]["submitBugReport"];
    importAsset: RendererApi["asset"]["importAsset"];
    generateCharacterImage: RendererApi["generation"]["generateCharacterImage"];
    generateCharacterSong: RendererApi["generation"]["generateCharacterSong"];
    generateCharacterPlaylist: RendererApi["generation"]["generateCharacterPlaylist"];
    generateLocationImage: RendererApi["generation"]["generateLocationImage"];
    generateLocationSong: RendererApi["generation"]["generateLocationSong"];
    generateLocationPlaylist: RendererApi["generation"]["generateLocationPlaylist"];
    generateOrganizationImage: RendererApi["generation"]["generateOrganizationImage"];
    generateOrganizationSong: RendererApi["generation"]["generateOrganizationSong"];
    generateOrganizationPlaylist: RendererApi["generation"]["generateOrganizationPlaylist"];
    createTimeline: (params: {
        projectId: string;
        name: string;
        description: string;
    }) => Promise<WorkspaceTimeline | null>;
    deleteTimeline: (timelineId: string) => Promise<void>;
    updateTimeline: (params: {
        timelineId: string;
        name?: string;
        description?: string;
        timeUnit?: string;
        startValue?: number;
    }) => Promise<void>;
    setSelectedTimelineId: (timelineId: string | null) => void;
    createEvent: (params: {
        timelineId: string;
        title: string;
        description: string;
        year: number;
        month?: number | null;
        day?: number | null;
        type: "chapter" | "scrap_note" | "event";
        associatedId: string | null;
    }) => Promise<void>;
    deleteEvent: (params: {
        eventId: string;
        timelineId: string;
    }) => Promise<void>;
    updateEvent: (params: {
        eventId: string;
        title?: string;
        description?: string;
        year?: number;
        month?: number | null;
        day?: number | null;
        characterIds?: string[];
        locationIds?: string[];
        organizationIds?: string[];
    }) => Promise<void>;
    saveUserSettings: RendererApi["logistics"]["saveUserSettings"];
    updateAccountEmail: RendererApi["auth"]["updateEmail"];
    updateAccountPassword: RendererApi["auth"]["updatePassword"];
    resetPasswordSuccess: boolean;
    globalFind: (request: GlobalFindRequest) => Promise<GlobalFindResponse>;
    globalFindAndReplace: (
        request: GlobalFindAndReplaceRequest,
    ) => Promise<GlobalFindAndReplaceResponse>;
};

export const useAppStore = create<AppStore>((set, get) => {
    const templateReloadInFlightByProject = new Map<string, Promise<void>>();

    const assertTemplateReloadNotInFlight = (projectId: string): void => {
        if (templateReloadInFlightByProject.has(projectId)) {
            throw new Error(
                "Template schema is updating. Please wait for it to finish before creating a new entity.",
            );
        }
    };

    const buildTemplateDerivedOptimisticAssignments = (
        projectId: string,
        entityType: "character" | "location" | "organization",
        entityId: string,
        now: Date,
    ): WorkspaceMetafieldAssignment[] => {
        const state = get();
        const template = state.editorTemplates.find(
            (item) =>
                item.projectId === projectId && item.editorType === entityType,
        );

        if (!template) {
            throw new Error(
                `${entityType[0].toUpperCase()}${entityType.slice(1)} template is missing for this project.`,
            );
        }

        const projectDefinitionIds = new Set(
            state.metafieldDefinitions
                .filter((definition) => definition.projectId === projectId)
                .map((definition) => definition.id),
        );

        const dedupedOrderedFields = [...template.fields]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .filter((field, index, fields) => {
                return (
                    fields.findIndex(
                        (candidate) =>
                            candidate.definitionId === field.definitionId,
                    ) === index
                );
            });

        const assignments: WorkspaceMetafieldAssignment[] = [];
        for (const [index, field] of dedupedOrderedFields.entries()) {
            if (!projectDefinitionIds.has(field.definitionId)) {
                throw new Error(
                    `Template definition ${field.definitionId} is missing for ${entityType}.`,
                );
            }

            assignments.push({
                id: generateOptimisticId(),
                projectId,
                definitionId: field.definitionId,
                entityType,
                entityId,
                valueJson: makeTemplateSeedValue(field.kind),
                orderIndex: index,
                createdAt: now,
                updatedAt: now,
            });
        }

        return assignments;
    };

    const resetWorkspaceState = (): Pick<
        AppStore,
        | "projectId"
        | "activeProjectName"
        | "workspaceProject"
        | "chapters"
        | "characters"
        | "locations"
        | "organizations"
        | "scrapNotes"
        | "timelines"
        | "selectedTimelineId"
        | "events"
        | "metafieldDefinitions"
        | "metafieldAssignments"
        | "editorTemplates"
        | "workspaceViewMode"
        | "assets"
        | "activeDocument"
        | "openTabs"
        | "autosaveStatus"
        | "autosaveError"
        | "cloudSyncError"
        | "pendingConflict"
        | "pendingConflictQueue"
        | "lastSavedAt"
        | "pendingEditsByChapterId"
        | "pendingEditsById"
        | "archivedEditsById"
        | "dirtyDocumentEditors"
        | "pendingTitleFocusDocument"
    > => ({
        projectId: "",
        activeProjectName: "",
        workspaceProject: null,
        chapters: [] as WorkspaceChapter[],
        characters: [] as WorkspaceCharacter[],
        locations: [] as WorkspaceLocation[],
        organizations: [] as WorkspaceOrganization[],
        scrapNotes: [] as WorkspaceScrapNote[],
        timelines: [] as WorkspaceTimeline[],
        selectedTimelineId: null as string | null,
        events: [] as WorkspaceEvent[],
        metafieldDefinitions: [] as WorkspaceMetafieldDefinition[],
        metafieldAssignments: [] as WorkspaceMetafieldAssignment[],
        editorTemplates: [] as WorkspaceEditorTemplate[],
        workspaceViewMode: "manuscript",
        assets: emptyAssets,
        activeDocument: null as WorkspaceDocumentRef | null,
        openTabs: [] as WorkspaceDocumentRef[],
        autosaveStatus: defaultAutosaveStatus,
        autosaveError: null,
        cloudSyncError: null,
        pendingConflict: null,
        pendingConflictQueue: [],
        lastSavedAt: null,
        pendingEditsByChapterId: {},
        pendingEditsById: {},
        archivedEditsById: {},
        dirtyDocumentEditors: {},
        pendingTitleFocusDocument: null,
    });

    const applyUnauthenticatedState = () => {
        set({
            ...resetWorkspaceState(),
            user: null,
            stage: "auth",
            projects: [],
            projectsStatus: "idle",
            projectsError: null,
            projectSelectionError: null,
            openingProjectId: null,
            currentUserId: "",
        });
    };

    let locationTreeMutationQueue: Promise<void> = Promise.resolve();

    const enqueueLocationTreeMutation = (
        operation: () => Promise<void>,
    ): Promise<void> => {
        const scheduled = locationTreeMutationQueue.then(operation, operation);
        locationTreeMutationQueue = scheduled
            .catch((): void => undefined)
            .then((): void => undefined);
        return scheduled;
    };

    const confirmDiscardPendingEdits = (): boolean => {
        const pendingChapterEditCount = Object.keys(
            get().pendingEditsById,
        ).length;
        const dirtyEditorCount = Object.keys(get().dirtyDocumentEditors).length;

        if (pendingChapterEditCount === 0 && dirtyEditorCount === 0) {
            return true;
        }

        const pendingParts: string[] = [];
        if (pendingChapterEditCount > 0) {
            pendingParts.push("pending chapter edits");
        }
        if (dirtyEditorCount > 0) {
            pendingParts.push("unsaved editor changes");
        }

        return window.confirm(
            `You have ${pendingParts.join(" and ")} that will be lost. Continue?`,
        );
    };

    const syncAuthState = async (user: RendererUser | null) => {
        const previousUserId = get().user?.id ?? null;
        if (!user) {
            applyUnauthenticatedState();
            return;
        }

        const isNewUser = !previousUserId || previousUserId !== user.id;
        set({
            user,
            currentUserId: user.id,
            ...(isNewUser
                ? { ...resetWorkspaceState(), projects: [] as ProjectSummary[] }
                : {}),
        });

        if (isNewUser) {
            await get().loadProjects(user.id);
        }

        const currentStage = get().stage;
        if (currentStage === "checkingSession" || currentStage === "auth") {
            set({ stage: "projectSelect" });
        }
    };

    const ensureAuthSubscription = () => {
        if (unsubscribeAuthState) {
            return;
        }
        unsubscribeAuthState = authEvents.onStateChanged((payload) => {
            void syncAuthState(payload.user);
        });
    };

    const applyTemplateSlices = (payload: OpenProjectPayload): void => {
        set({
            metafieldDefinitions: payload.metafieldDefinitions,
            metafieldAssignments: payload.metafieldAssignments,
            editorTemplates: payload.editorTemplates,
        });
    };

    const reloadProjectTemplateDataFromRepository = async (
        targetProjectId?: string,
    ): Promise<void> => {
        const projectId = (targetProjectId ?? get().projectId).trim();
        if (!projectId) {
            return;
        }

        const existingInFlight = templateReloadInFlightByProject.get(projectId);
        if (existingInFlight) {
            await existingInFlight;
            return;
        }

        const reloadPromise = (async () => {
            const payload = await rendererApi.project.openProject({ projectId });
            const current = get();

            if (
                current.stage !== "workspace" ||
                current.projectId !== projectId
            ) {
                return;
            }

            applyTemplateSlices(payload);
        })().finally(() => {
            templateReloadInFlightByProject.delete(projectId);
        });

        templateReloadInFlightByProject.set(projectId, reloadPromise);
        await reloadPromise;
    };

    const reconcileEntityMetafieldsFromRepository = async (
        projectId: string,
        entityType: "character" | "location" | "organization",
        entityId: string,
    ): Promise<void> => {
        const metafields = await rendererApi.metafield.listProjectMetafields({
            projectId,
        });

        const current = get();
        if (current.stage !== "workspace" || current.projectId !== projectId) {
            return;
        }

        const remoteEntityAssignments = metafields.assignments.filter(
            (assignment) =>
                assignment.entityType === entityType &&
                assignment.entityId === entityId,
        );

        set((state) => ({
            metafieldAssignments: [
                ...state.metafieldAssignments.filter(
                    (assignment) =>
                        !(
                            assignment.entityType === entityType &&
                            assignment.entityId === entityId
                        ),
                ),
                ...remoteEntityAssignments,
            ],
        }));
    };

    const ensureSyncSubscription = () => {
        if (unsubscribeSyncListeners.length > 0) {
            return;
        }

        // Fetch initial sync state immediately
        runInBackground(
            rendererApi.sync.getSyncState().then((payload) => {
                set({
                    syncStatus: payload.status,
                    lastSyncedAt: payload.lastSyncedAt,
                });
            }),
            (error) =>
                console.error("Failed to fetch initial sync state", error),
        );

        // Subscribe to sync state changes (online/offline/syncing)
        unsubscribeSyncListeners.push(
            syncEvents.onStateChanged((payload) => {
                set({
                    syncStatus: payload.status,
                    lastSyncedAt: payload.lastSyncedAt,
                });
            }),
        );

        // Subscribe to remote changes - log only, actual updates come via entity events
        unsubscribeSyncListeners.push(
            syncEvents.onRemoteChange(() => undefined),
        );

        // Subscribe to conflicts - show conflict resolution dialog
        unsubscribeSyncListeners.push(
            syncEvents.onConflict((payload) => {
                const { projectId, stage } = get();

                if (
                    payload.entityType === "metafieldAssignment" &&
                    hasRecentLocalMetafieldWrite(payload.entityId)
                ) {
                    return;
                }

                const conflictKey = getConflictKey(
                    payload.entityType,
                    payload.entityId,
                );
                const conflictEventKey = getConflictEventKey(payload);
                const resolvedAt = recentlyResolvedConflicts.get(conflictKey);
                if (
                    resolvedAt &&
                    Date.now() - resolvedAt < CONFLICT_SUPPRESSION_MS
                ) {
                    return;
                }

                // Only show conflicts for the currently open project
                if (stage === "workspace" && payload.projectId === projectId) {
                    set((state) => {
                        const alreadyQueued = state.pendingConflictQueue.some(
                            (queued) =>
                                getConflictEventKey(queued) ===
                                conflictEventKey,
                        );

                        if (alreadyQueued) {
                            return state;
                        }

                        const queue = [...state.pendingConflictQueue, payload];
                        return {
                            pendingConflictQueue: queue,
                            pendingConflict: state.pendingConflict ?? queue[0],
                        };
                    });
                }
            }),
        );

        unsubscribeSyncListeners.push(
            syncEvents.onTerminalFailure((payload) => {
                const reportAction = () => {
                    const state = get();
                    if (state.syncStatus === "offline") {
                        showToast({
                            variant: "info",
                            title: "Report unavailable offline",
                            description:
                                "Reconnect to the internet before submitting a sync bug report.",
                            durationMs: 3500,
                        });
                        return;
                    }

                    const userId = state.user?.id?.trim();
                    if (!userId) {
                        showToast({
                            variant: "error",
                            title: "Sign in required",
                            description:
                                "You must be signed in to submit a bug report.",
                            durationMs: 3500,
                        });
                        return;
                    }

                    if (
                        submittedFailureFingerprints.has(
                            payload.failureFingerprint,
                        )
                    ) {
                        showToast({
                            variant: "info",
                            title: "Already reported",
                            description:
                                "This sync failure was already reported in this session.",
                            durationMs: 3500,
                        });
                        return;
                    }

                    const notePrompt = window.prompt(
                        "Optional note (max 280 chars):",
                        "",
                    );
                    if (notePrompt === null) {
                        return;
                    }

                    const note = notePrompt.trim().slice(0, 280);
                    const diagnosticsPayload = {
                        ...payload,
                        syncStatus: state.syncStatus,
                        lastSyncedAt: state.lastSyncedAt,
                        stage: state.stage,
                        activeDocument: state.activeDocument,
                        openTabs: state.openTabs,
                        cloudSyncError: state.cloudSyncError,
                        submittedAt: new Date().toISOString(),
                    };

                    const submission = rendererApi.support.submitBugReport({
                        userId,
                        projectId: payload.projectId || null,
                        entityType: payload.entityType,
                        entityId: payload.entityId,
                        failureFingerprint: payload.failureFingerprint,
                        payload: diagnosticsPayload,
                        note: note || null,
                        appVersion: null,
                    });

                    void submission
                        .then(() => {
                            submittedFailureFingerprints.add(
                                payload.failureFingerprint,
                            );
                            showToast({
                                variant: "success",
                                title: "Report submitted",
                                description:
                                    "Thanks. Your sync failure report was submitted.",
                                durationMs: 3000,
                            });
                        })
                        .catch((error) => {
                            showToast({
                                variant: "error",
                                title: "Report failed",
                                description: createErrorMessage(
                                    error,
                                    "Could not submit bug report.",
                                ),
                                durationMs: 4500,
                            });
                        });
                };

                showToast({
                    id: `sync-terminal-${payload.failureFingerprint}`,
                    variant: "error",
                    title: "Sync retries exhausted",
                    description: payload.lastError,
                    actionLabel: "Report issue",
                    actionDisabled: get().syncStatus === "offline",
                    onAction: reportAction,
                    durationMs: 0,
                });
            }),
        );

        // Subscribe to incremental entity updates - update state in place
        unsubscribeSyncListeners.push(
            syncEvents.onEntityUpdated((payload) => {
                const { projectId, stage, assets, activeDocument, openTabs } =
                    get();

                // Only handle updates for the currently open project
                if (stage !== "workspace" || payload.projectId !== projectId) {
                    return;
                }

                const documentKind = toWorkspaceDocumentKind(
                    payload.entityType,
                );
                const allowAcceptedConflictOverwrite =
                    consumeAcceptedConflictOverwrite(
                        payload.entityType,
                        payload.entityId,
                    );
                if (
                    !allowAcceptedConflictOverwrite &&
                    documentKind &&
                    isOpenDocumentTarget(
                        activeDocument,
                        openTabs,
                        documentKind,
                        payload.entityId,
                    )
                ) {
                    return;
                }

                const data = payload.data;

                if (payload.entityType === "metafieldAssignment") {
                    const assignment =
                        data as unknown as WorkspaceMetafieldAssignment & {
                            entityType?: WorkspaceDocumentKind;
                            entityId?: string;
                        };
                    const targetKind = assignment.entityType;
                    const targetId = assignment.entityId;

                    if (
                        !allowAcceptedConflictOverwrite &&
                        targetKind &&
                        targetId &&
                        isOpenDocumentTarget(
                            activeDocument,
                            openTabs,
                            targetKind,
                            targetId,
                        )
                    ) {
                        return;
                    }
                }

                switch (payload.entityType) {
                    case "project": {
                        set({
                            workspaceProject:
                                data as unknown as WorkspaceProject,
                        });
                        break;
                    }
                    case "chapter": {
                        const chapter = data as unknown as WorkspaceChapter;
                        set((state) => ({
                            chapters: state.chapters.some(
                                (c) => c.id === chapter.id,
                            )
                                ? state.chapters.map((c) =>
                                      c.id === chapter.id ? chapter : c,
                                  )
                                : [...state.chapters, chapter].sort(
                                      (a, b) => a.order - b.order,
                                  ),
                        }));
                        break;
                    }
                    case "character": {
                        const character = data as unknown as WorkspaceCharacter;
                        set((state) => ({
                            characters: state.characters.some(
                                (c) => c.id === character.id,
                            )
                                ? state.characters.map((c) =>
                                      c.id === character.id ? character : c,
                                  )
                                : [...state.characters, character],
                        }));
                        break;
                    }
                    case "location": {
                        const location = data as unknown as WorkspaceLocation;
                        set((state) => ({
                            locations: state.locations.some(
                                (l) => l.id === location.id,
                            )
                                ? state.locations.map((l) =>
                                      l.id === location.id ? location : l,
                                  )
                                : [...state.locations, location],
                        }));
                        break;
                    }
                    case "organization": {
                        const organization =
                            data as unknown as WorkspaceOrganization;
                        set((state) => ({
                            organizations: state.organizations.some(
                                (o) => o.id === organization.id,
                            )
                                ? state.organizations.map((o) =>
                                      o.id === organization.id
                                          ? organization
                                          : o,
                                  )
                                : [...state.organizations, organization],
                        }));
                        break;
                    }
                    case "scrapNote": {
                        const scrapNote = data as unknown as WorkspaceScrapNote;
                        set((state) => ({
                            scrapNotes: state.scrapNotes.some(
                                (s) => s.id === scrapNote.id,
                            )
                                ? state.scrapNotes.map((s) =>
                                      s.id === scrapNote.id ? scrapNote : s,
                                  )
                                : [...state.scrapNotes, scrapNote],
                        }));
                        break;
                    }
                    case "editorTemplate": {
                        runInBackground(
                            reloadProjectTemplateDataFromRepository(
                                payload.projectId,
                            ),
                            (error) =>
                                console.error(
                                    "Failed to reload template data after realtime template update",
                                    error,
                                ),
                        );
                        break;
                    }
                    case "metafieldDefinition": {
                        const definition =
                            data as unknown as WorkspaceMetafieldDefinition;
                        set((state) => ({
                            metafieldDefinitions:
                                state.metafieldDefinitions.some(
                                    (d) => d.id === definition.id,
                                )
                                    ? state.metafieldDefinitions.map((d) =>
                                          d.id === definition.id
                                              ? definition
                                              : d,
                                      )
                                    : [
                                          ...state.metafieldDefinitions,
                                          definition,
                                      ],
                        }));
                        break;
                    }
                    case "metafieldAssignment": {
                        const assignment =
                            data as unknown as WorkspaceMetafieldAssignment;
                        set((state) => ({
                            metafieldAssignments:
                                state.metafieldAssignments.some(
                                    (a) => a.id === assignment.id,
                                )
                                    ? state.metafieldAssignments.map((a) =>
                                          a.id === assignment.id
                                              ? assignment
                                              : a,
                                      )
                                    : [
                                          ...state.metafieldAssignments,
                                          assignment,
                                      ],
                        }));
                        break;
                    }
                    case "image": {
                        const image = data as unknown as WorkspaceImageAsset;
                        set({
                            assets: {
                                ...assets,
                                images: { ...assets.images, [image.id]: image },
                            },
                        });
                        break;
                    }
                    case "bgm": {
                        const bgm = data as unknown as WorkspaceBGMAsset;
                        set({
                            assets: {
                                ...assets,
                                bgms: { ...assets.bgms, [bgm.id]: bgm },
                            },
                        });
                        break;
                    }
                    case "playlist": {
                        const playlist =
                            data as unknown as WorkspacePlaylistAsset;
                        set({
                            assets: {
                                ...assets,
                                playlists: {
                                    ...assets.playlists,
                                    [playlist.id]: playlist,
                                },
                            },
                        });
                        break;
                    }
                }
            }),
        );

        // Subscribe to entity deletions - remove from state
        unsubscribeSyncListeners.push(
            syncEvents.onEntityDeleted((payload) => {
                const { projectId, stage, assets, activeDocument, openTabs } =
                    get();

                if (stage !== "workspace") {
                    return;
                }

                // For child entities/assets, allow project-less deletes and trust globally unique IDs.
                // For project deletes, keep strict project matching.
                const isCurrentProjectDelete =
                    payload.entityType === "project" &&
                    payload.entityId === projectId;
                const isCurrentWorkspaceEntityDelete =
                    payload.entityType !== "project" &&
                    (!payload.projectId || payload.projectId === projectId);

                if (
                    !isCurrentProjectDelete &&
                    !isCurrentWorkspaceEntityDelete
                ) {
                    return;
                }

                const entityId = payload.entityId;

                // Helper to clean up tabs and active document if needed
                const cleanupDocumentRefs = (
                    kind: string,
                ): {
                    activeDocument: WorkspaceDocumentRef | null;
                    openTabs: WorkspaceDocumentRef[];
                } => {
                    const newTabs = openTabs.filter(
                        (t) => !(t.kind === kind && t.id === entityId),
                    );
                    const newActive =
                        activeDocument?.kind === kind &&
                        activeDocument?.id === entityId
                            ? (newTabs[0] ?? null)
                            : activeDocument;
                    return { activeDocument: newActive, openTabs: newTabs };
                };

                switch (payload.entityType) {
                    case "project": {
                        // If current project is deleted, go back to project selection
                        set({
                            ...resetWorkspaceState(),
                            stage: "projectSelect",
                        });
                        break;
                    }
                    case "chapter": {
                        set((state) => ({
                            workspaceProject: state.workspaceProject
                                ? {
                                      ...state.workspaceProject,
                                      chapterIds:
                                          state.workspaceProject.chapterIds.filter(
                                              (id) => id !== entityId,
                                          ),
                                  }
                                : state.workspaceProject,
                            chapters: state.chapters.filter(
                                (c) => c.id !== entityId,
                            ),
                            ...cleanupDocumentRefs("chapter"),
                        }));
                        break;
                    }
                    case "character": {
                        set((state) => ({
                            workspaceProject: state.workspaceProject
                                ? {
                                      ...state.workspaceProject,
                                      characterIds:
                                          state.workspaceProject.characterIds.filter(
                                              (id) => id !== entityId,
                                          ),
                                  }
                                : state.workspaceProject,
                            characters: state.characters.filter(
                                (c) => c.id !== entityId,
                            ),
                            ...cleanupDocumentRefs("character"),
                        }));
                        break;
                    }
                    case "location": {
                        set((state) => ({
                            workspaceProject: state.workspaceProject
                                ? {
                                      ...state.workspaceProject,
                                      locationIds:
                                          state.workspaceProject.locationIds.filter(
                                              (id) => id !== entityId,
                                          ),
                                  }
                                : state.workspaceProject,
                            locations: state.locations.filter(
                                (l) => l.id !== entityId,
                            ),
                            ...cleanupDocumentRefs("location"),
                        }));
                        break;
                    }
                    case "organization": {
                        set((state) => ({
                            workspaceProject: state.workspaceProject
                                ? {
                                      ...state.workspaceProject,
                                      organizationIds:
                                          state.workspaceProject.organizationIds.filter(
                                              (id) => id !== entityId,
                                          ),
                                  }
                                : state.workspaceProject,
                            organizations: state.organizations.filter(
                                (o) => o.id !== entityId,
                            ),
                            ...cleanupDocumentRefs("organization"),
                        }));
                        break;
                    }
                    case "scrapNote": {
                        set((state) => ({
                            workspaceProject: state.workspaceProject
                                ? {
                                      ...state.workspaceProject,
                                      scrapNoteIds:
                                          state.workspaceProject.scrapNoteIds.filter(
                                              (id) => id !== entityId,
                                          ),
                                  }
                                : state.workspaceProject,
                            scrapNotes: state.scrapNotes.filter(
                                (s) => s.id !== entityId,
                            ),
                            ...cleanupDocumentRefs("scrapNote"),
                        }));
                        break;
                    }
                    case "editorTemplate": {
                        runInBackground(
                            reloadProjectTemplateDataFromRepository(
                                payload.projectId,
                            ),
                            (error) =>
                                console.error(
                                    "Failed to reload template data after realtime template deletion",
                                    error,
                                ),
                        );
                        break;
                    }
                    case "metafieldDefinition": {
                        set((state) => ({
                            metafieldDefinitions:
                                state.metafieldDefinitions.filter(
                                    (d) => d.id !== entityId,
                                ),
                            metafieldAssignments:
                                state.metafieldAssignments.filter(
                                    (a) => a.definitionId !== entityId,
                                ),
                        }));
                        break;
                    }
                    case "metafieldAssignment": {
                        set((state) => ({
                            metafieldAssignments:
                                state.metafieldAssignments.filter(
                                    (a) => a.id !== entityId,
                                ),
                        }));
                        break;
                    }
                    case "image": {
                        const remainingImages = omitKey(
                            assets.images,
                            entityId,
                        );
                        set({
                            assets: { ...assets, images: remainingImages },
                        });
                        break;
                    }
                    case "bgm": {
                        const remainingBgms = omitKey(assets.bgms, entityId);
                        set({
                            assets: { ...assets, bgms: remainingBgms },
                        });
                        break;
                    }
                    case "playlist": {
                        const remainingPlaylists = omitKey(
                            assets.playlists,
                            entityId,
                        );
                        set({
                            assets: {
                                ...assets,
                                playlists: remainingPlaylists,
                            },
                        });
                        break;
                    }
                }
            }),
        );
    };

    const loadProjectWorkspace = async (
        targetProjectId: string,
        preferredSelection?: WorkspaceDocumentRef | null,
    ) => {
        const payload = await rendererApi.project.openProject({
            projectId: targetProjectId,
        });
        const indexedAssets = indexAssets(payload.assets);
        const nextSelection = resolveDocumentSelection(
            payload,
            preferredSelection ?? get().activeDocument,
        );
        // Default to Main timeline when opening project
        const mainTimeline = payload.timelines.find((t) => t.name === "Main");
        set({
            projectId: payload.project.id,
            activeProjectName: payload.project.title,
            workspaceProject: payload.project,
            chapters: payload.chapters,
            characters: payload.characters,
            locations: payload.locations,
            organizations: payload.organizations,
            scrapNotes: payload.scrapNotes,
            timelines: payload.timelines,
            selectedTimelineId: mainTimeline?.id ?? null,
            events: payload.events,
            metafieldDefinitions: payload.metafieldDefinitions,
            metafieldAssignments: payload.metafieldAssignments,
            editorTemplates: payload.editorTemplates,
            assets: indexedAssets,
            activeDocument: nextSelection,
            openTabs: nextSelection ? [nextSelection] : [],
            stage: "workspace",
            autosaveStatus: defaultAutosaveStatus,
            autosaveError: null,
            pendingConflict: null,
            pendingConflictQueue: [],
            lastSavedAt: null,
        });
        return payload;
    };

    return {
        stage: "checkingSession",
        previousStage: null,
        authMode: "login",
        authForm: initialAuthForm,
        authError: null,
        isAuthSubmitting: false,
        resetPasswordSuccess: false,
        user: null,
        currentUserId: "",
        projects: [],
        projectCovers: {},
        projectsStatus: "idle",
        projectsError: null,
        projectSelectionError: null,
        openingProjectId: null,
        isImporting: false,
        importProgress: 0,
        activeProjectName: "",
        projectId: "",
        workspaceProject: null,
        chapters: [],
        characters: [],
        locations: [],
        organizations: [],
        scrapNotes: [],
        timelines: [],
        selectedTimelineId: null,
        events: [],
        metafieldDefinitions: [],
        metafieldAssignments: [],
        editorTemplates: [],
        workspaceViewMode: "manuscript",
        assets: emptyAssets,
        activeDocument: null,
        openTabs: [],
        autosaveStatus: defaultAutosaveStatus,
        autosaveError: null,
        cloudSyncError: null,
        syncStatus: "offline",
        lastSyncedAt: null,
        pendingConflict: null,
        pendingConflictQueue: [],
        lastSavedAt: null,
        draggedDocument: null,
        shortcutStates: defaultShortcutStates,
        bootstrapSession: async () => {
            ensureAuthSubscription();
            ensureSyncSubscription();
            set({ stage: "checkingSession" });
            try {
                const snapshot = await rendererApi.auth.getState();
                await syncAuthState(snapshot.user);
            } catch (_error) {
                applyUnauthenticatedState();
            }
        },
        setAuthField: (field, value) => {
            set((state) => ({
                authForm: {
                    ...state.authForm,
                    [field]: value,
                },
            }));
        },
        setAuthMode: (mode) => {
            set({
                authMode: mode,
                authError: null,
                resetPasswordSuccess: false,
            });
        },
        toggleAuthMode: () => {
            set((state) => ({
                authMode: state.authMode === "login" ? "register" : "login",
                authError: null,
                resetPasswordSuccess: false,
            }));
        },
        submitAuth: async () => {
            const { authForm, authMode } = get();
            const email = authForm.email.trim().toLowerCase();
            const password = authForm.password;
            if (!email || !password) {
                set({ authError: "Email and password are required." });
                return;
            }

            set({ isAuthSubmitting: true, authError: null });
            try {
                if (authMode === "login") {
                    await rendererApi.auth.loginUser({ email, password });
                } else {
                    await rendererApi.auth.registerUser({
                        email,
                        password,
                    });
                }

                set({ authForm: initialAuthForm });
            } catch (error) {
                set({
                    authError: normalizeUserFacingError(
                        error,
                        "Unable to complete request.",
                        authMode === "login" ? "auth-login" : "auth-register",
                    ),
                });
            } finally {
                set({ isAuthSubmitting: false });
            }
        },
        requestPasswordReset: async () => {
            const { authForm } = get();
            const email = authForm.email.trim().toLowerCase();
            if (!email) {
                set({ authError: "Email is required." });
                return;
            }

            set({
                isAuthSubmitting: true,
                authError: null,
                resetPasswordSuccess: false,
            });
            try {
                await rendererApi.auth.resetPassword({ email });
                set({ resetPasswordSuccess: true });
            } catch (error) {
                set({
                    authError: normalizeUserFacingError(
                        error,
                        "Unable to send reset email.",
                        "auth-reset-password",
                    ),
                });
            } finally {
                set({ isAuthSubmitting: false });
            }
        },
        loadProjects: async (userId) => {
            const resolvedUserId = userId ?? get().user?.id ?? "";
            if (!resolvedUserId) {
                set({
                    projects: [],
                    projectCovers: {},
                    projectsStatus: "idle",
                });
                return;
            }

            set({ projectsStatus: "loading", projectsError: null });
            try {
                const response = await rendererApi.project.loadProjectList({
                    userId: resolvedUserId,
                });
                set({
                    projects: response.projects,
                    projectCovers: response.covers,
                    projectsStatus: "idle",
                });
            } catch (error) {
                set({
                    projectsStatus: "error",
                    projectsError: createErrorMessage(
                        error,
                        "Unable to load projects.",
                    ),
                });
            }
        },
        setProjectsError: (message) => {
            set({ projectsError: message });
        },
        createProject: async ({ title }) => {
            const { user } = get();
            if (!user) {
                throw new Error("User session missing");
            }

            set({ projectsError: null });
            try {
                const { project } = await rendererApi.project.createProject({
                    userId: user.id,
                    title,
                });

                // Enter the new project immediately after it is created.
                await loadProjectWorkspace(project.id);

                // Keep the list fresh for the next time project selection is shown.
                get()
                    .loadProjects(user.id)
                    .catch(() => {
                        /* noop */
                    });
            } catch (error) {
                set({
                    projectsError: createErrorMessage(
                        error,
                        "Failed to create project.",
                    ),
                });
            }
        },
        importProject: async () => {
            const { user } = get();
            if (!user) {
                throw new Error("User session missing");
            }

            const result = await window.fileDialog.showOpenDialog({
                title: "Import EPUB",
                filters: [{ name: "EPUB Files", extensions: ["epub"] }],
                properties: ["openFile"],
            });

            if (result.canceled || result.filePaths.length === 0) {
                return;
            }

            const filePath = result.filePaths[0];

            set({ isImporting: true, importProgress: 0, projectsError: null });

            const unsubscribe = window.importEvents.onProgress(
                ({ progress }) => {
                    set({ importProgress: progress });
                },
            );

            try {
                await rendererApi.project.importProject({
                    userId: user.id,
                    filePath,
                });
                await get().loadProjects(user.id);
            } catch (error) {
                set({
                    projectsError: createErrorMessage(
                        error,
                        "Failed to import EPUB.",
                    ),
                });
            } finally {
                unsubscribe();
                set({ isImporting: false, importProgress: 0 });
            }
        },
        openProject: async (project) => {
            if (!confirmDiscardPendingEdits()) {
                return;
            }
            set({ projectSelectionError: null, openingProjectId: project.id });
            try {
                await loadProjectWorkspace(project.id);
            } catch (error) {
                set({
                    projectSelectionError: createErrorMessage(
                        error,
                        "Unable to open project.",
                    ),
                });
            } finally {
                set({ openingProjectId: null });
            }
        },
        reloadActiveProject: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                return;
            }

            if (!confirmDiscardPendingEdits()) {
                return;
            }
            await loadProjectWorkspace(projectId);
        },
        setProjectSelectionError: (message) => {
            set({ projectSelectionError: message });
        },
        flushActiveDocumentContent: async () => {
            const projectId = get().projectId.trim();
            const selection = get().activeDocument;
            if (!projectId || !selection) {
                return;
            }

            if (selection.kind === "chapter") {
                const chapter = get().chapters.find(
                    (c) => c.id === selection.id,
                );
                if (!chapter) return;

                await rendererApi.logistics.saveChapterContent({
                    chapterId: chapter.id,
                    content: chapter.content,
                });
                set({ lastSavedAt: Date.now() });
                return;
            }

            if (selection.kind === "scrapNote") {
                const note = get().scrapNotes.find(
                    (s) => s.id === selection.id,
                );
                if (!note) return;

                await rendererApi.manuscript.updateScrapNote({
                    scrapNoteId: note.id,
                    content: note.content,
                });
                set({ lastSavedAt: Date.now() });
            }
        },
        returnToProjects: async () => {
            const { user } = get();
            if (!user) {
                return;
            }

            if (!confirmDiscardPendingEdits()) {
                return;
            }

            try {
                await get().flushActiveDocumentContent();
            } catch (error) {
                set({
                    autosaveError: createErrorMessage(
                        error,
                        "Failed to save before leaving the project.",
                    ),
                });
                throw error;
            }

            set({
                projectId: "",
                activeProjectName: "",
                workspaceProject: null,
                chapters: [],
                characters: [],
                locations: [],
                organizations: [],
                scrapNotes: [],
                editorTemplates: [],
                assets: emptyAssets,
                activeDocument: null,
                autosaveStatus: defaultAutosaveStatus,
                autosaveError: null,
                lastSavedAt: null,
                stage: "projectSelect",
            });
            await get().loadProjects(user.id);
        },
        logout: async () => {
            if (!confirmDiscardPendingEdits()) {
                return;
            }
            try {
                await rendererApi.auth.logoutUser();
            } catch (_error) {
                // Ignore logout failures locally; intent is to clear session.
            }
        },
        deleteAccount: async () => {
            await rendererApi.auth.deleteAccount();
        },
        setActiveDocument: (selection) => {
            set((state) => {
                const exists = state.openTabs.some(
                    (tab) =>
                        tab.kind === selection.kind && tab.id === selection.id,
                );
                return {
                    activeDocument: selection,
                    openTabs: exists
                        ? state.openTabs
                        : [...state.openTabs, selection],
                    autosaveStatus: defaultAutosaveStatus,
                    autosaveError: null,
                };
            });
        },
        closeTab: (selection) => {
            set((state) => {
                const newTabs = state.openTabs.filter(
                    (tab) =>
                        !(
                            tab.kind === selection.kind &&
                            tab.id === selection.id
                        ),
                );

                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === selection.kind &&
                    state.activeDocument.id === selection.id
                ) {
                    nextActive =
                        newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
                }

                return {
                    openTabs: newTabs,
                    activeDocument: nextActive,
                    autosaveStatus: defaultAutosaveStatus,
                    autosaveError: null,
                };
            });
        },
        reorderTabs: (newOrder) => {
            set({ openTabs: newOrder });
        },
        updateChapterLocally: (chapterId, patch) => {
            set((state) => ({
                chapters: patchEntity(state.chapters, chapterId, patch),
            }));
        },
        updateScrapNoteLocally: (scrapNoteId, patch) => {
            set((state) => ({
                scrapNotes: patchEntity(state.scrapNotes, scrapNoteId, patch),
            }));
        },
        updateCharacterLocally: (characterId, patch) => {
            set((state) => ({
                characters: patchEntity(state.characters, characterId, patch),
            }));
        },
        updateLocationLocally: (locationId, patch) => {
            set((state) => ({
                locations: patchEntity(state.locations, locationId, patch),
            }));
        },
        updateOrganizationLocally: (organizationId, patch) => {
            set((state) => ({
                organizations: patchEntity(
                    state.organizations,
                    organizationId,
                    patch,
                ),
            }));
        },
        addOrUpdateMetafieldDefinitionLocally: (definition) => {
            set((state) => ({
                metafieldDefinitions: state.metafieldDefinitions.some(
                    (item) => item.id === definition.id,
                )
                    ? state.metafieldDefinitions.map((item) =>
                          item.id === definition.id ? definition : item,
                      )
                    : [...state.metafieldDefinitions, definition],
            }));
        },
        addOrUpdateMetafieldAssignmentLocally: (assignment) => {
            markLocalMetafieldWrite(assignment.id);
            set((state) => ({
                metafieldAssignments: state.metafieldAssignments.some(
                    (item) => item.id === assignment.id,
                )
                    ? state.metafieldAssignments.map((item) =>
                          item.id === assignment.id ? assignment : item,
                      )
                    : [...state.metafieldAssignments, assignment],
            }));
        },
        updateMetafieldAssignmentLocally: (assignmentId, patch) => {
            if (
                Object.prototype.hasOwnProperty.call(patch, "valueJson") ||
                Object.prototype.hasOwnProperty.call(patch, "orderIndex")
            ) {
                markLocalMetafieldWrite(assignmentId);
            }

            set((state) => ({
                metafieldAssignments: patchEntity(
                    state.metafieldAssignments,
                    assignmentId,
                    patch,
                ),
            }));
        },
        removeMetafieldAssignmentLocally: (assignmentId) => {
            set((state) => ({
                metafieldAssignments: state.metafieldAssignments.filter(
                    (item) => item.id !== assignmentId,
                ),
            }));
        },
        removeMetafieldDefinitionLocally: (definitionId) => {
            set((state) => ({
                metafieldDefinitions: state.metafieldDefinitions.filter(
                    (item) => item.id !== definitionId,
                ),
                metafieldAssignments: state.metafieldAssignments.filter(
                    (item) => item.definitionId !== definitionId,
                ),
            }));
        },
        getEditorTemplateForType: (editorType) => {
            return (
                get().editorTemplates.find(
                    (template) => template.editorType === editorType,
                ) ?? null
            );
        },
        reloadProjectTemplateData: async (targetProjectId) => {
            await reloadProjectTemplateDataFromRepository(targetProjectId);
        },
        createChapterEntry: async (order) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating chapters.");
            }

            const existing = get()
                .chapters.slice()
                .sort((a, b) => a.order - b.order);
            const requestedOrder =
                typeof order === "number" ? Math.floor(order) : existing.length;
            const normalizedOrder = Math.max(0, requestedOrder);
            const insertIndex = Math.min(normalizedOrder, existing.length);

            const now = new Date();
            const id = generateOptimisticId();

            set((state) => {
                const sorted = state.chapters
                    .slice()
                    .sort((a, b) => a.order - b.order);

                sorted.splice(insertIndex, 0, {
                    id,
                    title: "New Chapter",
                    order: insertIndex,
                    content: "",
                    eventId: null,
                    createdAt: now,
                    updatedAt: now,
                });

                const nextChapters = sorted.map((chapter, index) => {
                    if (chapter.order === index) {
                        return chapter;
                    }
                    return { ...chapter, order: index, updatedAt: now };
                });

                const nextTab: WorkspaceDocumentRef = { kind: "chapter", id };
                const nextTabs = state.openTabs.some(
                    (t) => t.kind === "chapter" && t.id === id,
                )
                    ? state.openTabs
                    : [...state.openTabs, nextTab];

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          chapterIds: nextChapters.map((c) => c.id),
                          updatedAt: now,
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    chapters: nextChapters,
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.manuscript.createChapter({
                    projectId,
                    order: insertIndex,
                    id,
                }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new chapter to the cloud.",
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        createScrapNoteEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating scrap notes.");
            }

            const now = new Date();
            const id = generateOptimisticId();

            set((state) => {
                const nextNotes = [
                    ...state.scrapNotes,
                    {
                        id,
                        title: "New Scrap Note",
                        content: "",
                        isPinned: false,
                        eventId: null,
                        createdAt: now,
                        updatedAt: now,
                    },
                ];

                const nextTab: WorkspaceDocumentRef = {
                    kind: "scrapNote",
                    id,
                };
                const nextTabs = state.openTabs.some(
                    (t) => t.kind === "scrapNote" && t.id === id,
                )
                    ? state.openTabs
                    : [...state.openTabs, nextTab];

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          scrapNoteIds: [
                              ...state.workspaceProject.scrapNoteIds,
                              id,
                          ],
                          updatedAt: now,
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    scrapNotes: nextNotes,
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.manuscript.createScrapNote({ projectId, id }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new scrap note to the cloud.",
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        createCharacterEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating characters.");
            }

            assertTemplateReloadNotInFlight(projectId);

            const now = new Date();
            const id = generateOptimisticId();
            const optimisticAssignments =
                buildTemplateDerivedOptimisticAssignments(
                    projectId,
                    "character",
                    id,
                    now,
                );

            set((state) => {
                const nextCharacters = [
                    ...state.characters,
                    {
                        id,
                        name: "",
                        description: "",
                        currentLocationId: null,
                        backgroundLocationId: null,
                        organizationId: null,
                        bgmId: null,
                        playlistId: null,
                        galleryImageIds: [],
                        createdAt: now,
                        updatedAt: now,
                    },
                ];

                const nextTab: WorkspaceDocumentRef = {
                    kind: "character",
                    id,
                };
                const nextTabs = state.openTabs.some(
                    (t) => t.kind === "character" && t.id === id,
                )
                    ? state.openTabs
                    : [...state.openTabs, nextTab];

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          characterIds: [
                              ...state.workspaceProject.characterIds,
                              id,
                          ],
                          updatedAt: now,
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    characters: nextCharacters,
                    metafieldAssignments: [
                        ...state.metafieldAssignments,
                        ...optimisticAssignments,
                    ],
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                    pendingTitleFocusDocument: nextTab,
                };
            });

            runInBackground(
                (async () => {
                    await rendererApi.world.createCharacter({ projectId, id });
                    await reconcileEntityMetafieldsFromRepository(
                        projectId,
                        "character",
                        id,
                    );
                })(),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new character to the cloud.",
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        createLocationEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating locations.");
            }

            assertTemplateReloadNotInFlight(projectId);

            const now = new Date();
            const id = generateOptimisticId();
            const optimisticAssignments =
                buildTemplateDerivedOptimisticAssignments(
                    projectId,
                    "location",
                    id,
                    now,
                );

            set((state) => {
                const nextLocations = [
                    ...state.locations,
                    {
                        id,
                        name: "",
                        description: "",
                        createdAt: now,
                        updatedAt: now,
                        bgmId: null,
                        playlistId: null,
                        galleryImageIds: [],
                        sublocationIds: [],
                        characterIds: [],
                        organizationIds: [],
                    },
                ];

                const nextTab: WorkspaceDocumentRef = {
                    kind: "location",
                    id,
                };
                const nextTabs = state.openTabs.some(
                    (t) => t.kind === "location" && t.id === id,
                )
                    ? state.openTabs
                    : [...state.openTabs, nextTab];

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          locationIds: [
                              ...state.workspaceProject.locationIds,
                              id,
                          ],
                          updatedAt: now,
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    locations: nextLocations,
                    metafieldAssignments: [
                        ...state.metafieldAssignments,
                        ...optimisticAssignments,
                    ],
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                    pendingTitleFocusDocument: nextTab,
                };
            });

            runInBackground(
                (async () => {
                    await rendererApi.world.createLocation({ projectId, id });
                    await reconcileEntityMetafieldsFromRepository(
                        projectId,
                        "location",
                        id,
                    );
                })(),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new location to the cloud.",
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        createOrganizationEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error(
                    "Open a project before creating organizations.",
                );
            }

            assertTemplateReloadNotInFlight(projectId);

            const now = new Date();
            const id = generateOptimisticId();
            const optimisticAssignments =
                buildTemplateDerivedOptimisticAssignments(
                    projectId,
                    "organization",
                    id,
                    now,
                );

            set((state) => {
                const nextOrganizations = [
                    ...state.organizations,
                    {
                        id,
                        name: "",
                        description: "",
                        locationIds: [],
                        galleryImageIds: [],
                        playlistId: null,
                        bgmId: null,
                        createdAt: now,
                        updatedAt: now,
                    },
                ];

                const nextTab: WorkspaceDocumentRef = {
                    kind: "organization",
                    id,
                };
                const nextTabs = state.openTabs.some(
                    (t) => t.kind === "organization" && t.id === id,
                )
                    ? state.openTabs
                    : [...state.openTabs, nextTab];

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          organizationIds: [
                              ...state.workspaceProject.organizationIds,
                              id,
                          ],
                          updatedAt: now,
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    organizations: nextOrganizations,
                    metafieldAssignments: [
                        ...state.metafieldAssignments,
                        ...optimisticAssignments,
                    ],
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                    pendingTitleFocusDocument: nextTab,
                };
            });

            runInBackground(
                (async () => {
                    await rendererApi.world.createOrganization({ projectId, id });
                    await reconcileEntityMetafieldsFromRepository(
                        projectId,
                        "organization",
                        id,
                    );
                })(),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new organization to the cloud.",
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        deleteProject: async (projectId) => {
            const { user } = get();
            if (!user) {
                throw new Error("User session missing");
            }

            set({ projectsError: null });
            try {
                await rendererApi.project.deleteProject({
                    projectId,
                    userId: user.id,
                });
                await get().loadProjects(user.id);
            } catch (error) {
                set({
                    projectsError: createErrorMessage(
                        error,
                        "Failed to delete project.",
                    ),
                });
            }
        },
        renameProject: async (projectId, title) => {
            set({ projectsError: null });
            try {
                await rendererApi.project.renameProject({
                    projectId,
                    title,
                });
                set((state) => ({
                    projects: state.projects.map((p) =>
                        p.id === projectId
                            ? { ...p, title, updatedAt: new Date() }
                            : p,
                    ),
                }));
            } catch (error) {
                set({
                    projectsError: createErrorMessage(
                        error,
                        "Failed to rename project.",
                    ),
                });
            }
        },
        deleteChapter: async (chapterId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting chapters.");
            }

            set((state) => {
                const filtered = state.chapters.filter(
                    (c) => c.id !== chapterId,
                );

                // Re-index orders to close the gap
                const nextChapters = filtered
                    .sort((a, b) => a.order - b.order)
                    .map((c, index) => ({ ...c, order: index }));

                const nextTabs = state.openTabs.filter(
                    (t) => !(t.kind === "chapter" && t.id === chapterId),
                );

                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === "chapter" &&
                    state.activeDocument.id === chapterId
                ) {
                    nextActive =
                        nextTabs.length > 0
                            ? nextTabs[nextTabs.length - 1]
                            : null;
                }

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          chapterIds: state.workspaceProject.chapterIds.filter(
                              (id) => id !== chapterId,
                          ),
                          updatedAt: new Date(),
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    chapters: nextChapters,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.manuscript.deleteChapter({
                    projectId,
                    chapterId,
                }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to delete chapter in the cloud.",
                        ) +
                        "\n\nThe chapter was deleted locally, but was NOT deleted in the cloud. Please resolve sync conflicts or retry online.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        deleteScrapNote: async (scrapNoteId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting scrap notes.");
            }

            set((state) => {
                const nextNotes = state.scrapNotes.filter(
                    (n) => n.id !== scrapNoteId,
                );
                const nextTabs = state.openTabs.filter(
                    (t) => !(t.kind === "scrapNote" && t.id === scrapNoteId),
                );
                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === "scrapNote" &&
                    state.activeDocument.id === scrapNoteId
                ) {
                    nextActive =
                        nextTabs.length > 0
                            ? nextTabs[nextTabs.length - 1]
                            : null;
                }

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          scrapNoteIds:
                              state.workspaceProject.scrapNoteIds.filter(
                                  (id) => id !== scrapNoteId,
                              ),
                          updatedAt: new Date(),
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    scrapNotes: nextNotes,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.manuscript.deleteScrapNote({
                    projectId,
                    scrapNoteId,
                }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to delete scrap note in the cloud.",
                        ) +
                        "\n\nThe scrap note was deleted locally, but was NOT deleted in the cloud. Please resolve sync conflicts or retry online.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        deleteCharacter: async (characterId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting characters.");
            }

            set((state) => {
                const nextCharacters = state.characters.filter(
                    (c) => c.id !== characterId,
                );
                const nextTabs = state.openTabs.filter(
                    (t) => !(t.kind === "character" && t.id === characterId),
                );
                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === "character" &&
                    state.activeDocument.id === characterId
                ) {
                    nextActive =
                        nextTabs.length > 0
                            ? nextTabs[nextTabs.length - 1]
                            : null;
                }

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          characterIds:
                              state.workspaceProject.characterIds.filter(
                                  (id) => id !== characterId,
                              ),
                          updatedAt: new Date(),
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    characters: nextCharacters,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.world.deleteCharacter({
                    projectId,
                    characterId,
                }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to delete character in the cloud.",
                        ) +
                        "\n\nThe character was deleted locally, but was NOT deleted in the cloud. Please resolve sync conflicts or retry online.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        deleteLocation: async (locationId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting locations.");
            }

            set((state) => {
                const locationsById = new Map(
                    state.locations.map((location) => [location.id, location]),
                );

                const collectSubtreeIds = (rootId: string): Set<string> => {
                    const collected = new Set<string>();
                    const stack = [rootId];

                    while (stack.length > 0) {
                        const currentId = stack.pop();
                        if (!currentId || collected.has(currentId)) {
                            continue;
                        }

                        collected.add(currentId);
                        const currentLocation = locationsById.get(currentId);
                        if (!currentLocation) {
                            continue;
                        }

                        currentLocation.sublocationIds.forEach((childId) => {
                            stack.push(childId);
                        });
                    }

                    return collected;
                };

                const subtreeIds = collectSubtreeIds(locationId);

                const nextLocations = state.locations
                    .filter((location) => !subtreeIds.has(location.id))
                    .map((location) => ({
                        ...location,
                        sublocationIds: location.sublocationIds.filter(
                            (childId) => !subtreeIds.has(childId),
                        ),
                    }));
                const nextTabs = state.openTabs.filter(
                    (tab) =>
                        !(tab.kind === "location" && subtreeIds.has(tab.id)),
                );
                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === "location" &&
                    subtreeIds.has(state.activeDocument.id)
                ) {
                    nextActive =
                        nextTabs.length > 0
                            ? nextTabs[nextTabs.length - 1]
                            : null;
                }

                return {
                    workspaceProject: state.workspaceProject
                        ? {
                              ...state.workspaceProject,
                              locationIds:
                                  state.workspaceProject.locationIds.filter(
                                      (id) => !subtreeIds.has(id),
                                  ),
                          }
                        : state.workspaceProject,
                    locations: nextLocations,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.world.deleteLocation({
                    projectId,
                    locationId,
                }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to delete location in the cloud.",
                        ) +
                        "\n\nThe location was deleted locally, but was NOT deleted in the cloud. Please resolve sync conflicts or retry online.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        deleteOrganization: async (organizationId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error(
                    "Open a project before deleting organizations.",
                );
            }

            set((state) => {
                const nextOrgs = state.organizations.filter(
                    (o) => o.id !== organizationId,
                );
                const nextTabs = state.openTabs.filter(
                    (t) =>
                        !(t.kind === "organization" && t.id === organizationId),
                );
                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === "organization" &&
                    state.activeDocument.id === organizationId
                ) {
                    nextActive =
                        nextTabs.length > 0
                            ? nextTabs[nextTabs.length - 1]
                            : null;
                }

                const nextProject = state.workspaceProject
                    ? {
                          ...state.workspaceProject,
                          organizationIds:
                              state.workspaceProject.organizationIds.filter(
                                  (id) => id !== organizationId,
                              ),
                          updatedAt: new Date(),
                      }
                    : state.workspaceProject;

                return {
                    workspaceProject: nextProject,
                    organizations: nextOrgs,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.world.deleteOrganization({
                    projectId,
                    organizationId,
                }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to delete organization in the cloud.",
                        ) +
                        "\n\nThe organization was deleted locally, but was NOT deleted in the cloud. Please resolve sync conflicts or retry online.";
                    set({ cloudSyncError: message });
                    alert(message);
                },
            );
        },
        reorderChapters: async (newOrder) => {
            const projectId = get().projectId.trim();
            if (!projectId) return;

            // Optimistic update
            set((state) => {
                const chapterMap = new Map(
                    state.chapters.map((c) => [c.id, c]),
                );
                const reordered = newOrder
                    .map((id, index) => {
                        const chapter = chapterMap.get(id);
                        if (chapter) {
                            return { ...chapter, order: index };
                        }
                        return null;
                    })
                    .filter((c): c is WorkspaceChapter => c !== null);

                return { chapters: reordered };
            });

            try {
                await rendererApi.logistics.saveManuscriptStructure({
                    projectId,
                    orderedChapterIds: newOrder,
                });
            } catch (error) {
                set({
                    autosaveError: createErrorMessage(
                        error,
                        "Failed to save chapter order.",
                    ),
                });
            }
        },
        reorderScrapNotes: async (newOrder) => {
            const projectId = get().projectId.trim();
            if (!projectId) return;

            set((state) => {
                const map = new Map(state.scrapNotes.map((i) => [i.id, i]));
                const reordered = newOrder
                    .map((id) => map.get(id))
                    .filter((i): i is WorkspaceScrapNote => !!i);
                return { scrapNotes: reordered };
            });

            try {
                await rendererApi.project.reorderProjectItems({
                    projectId,
                    kind: "scrapNote",
                    orderedIds: newOrder,
                });
            } catch (error) {
                set({
                    autosaveError: createErrorMessage(
                        error,
                        "Failed to save scrap note order.",
                    ),
                });
            }
        },
        reorderCharacters: async (newOrder) => {
            const projectId = get().projectId.trim();
            if (!projectId) return;

            set((state) => {
                const map = new Map(state.characters.map((i) => [i.id, i]));
                const reordered = newOrder
                    .map((id) => map.get(id))
                    .filter((i): i is WorkspaceCharacter => !!i);
                return { characters: reordered };
            });

            try {
                await rendererApi.project.reorderProjectItems({
                    projectId,
                    kind: "character",
                    orderedIds: newOrder,
                });
            } catch (error) {
                set({
                    autosaveError: createErrorMessage(
                        error,
                        "Failed to save character order.",
                    ),
                });
            }
        },
        reorderLocations: async (newOrder) => {
            const projectId = get().projectId.trim();
            if (!projectId) return;

            set((state) => {
                const map = new Map(state.locations.map((i) => [i.id, i]));
                const reordered = newOrder
                    .map((id) => map.get(id))
                    .filter((i): i is WorkspaceLocation => !!i);
                return { locations: reordered };
            });

            try {
                await rendererApi.project.reorderProjectItems({
                    projectId,
                    kind: "location",
                    orderedIds: newOrder,
                });
            } catch (error) {
                set({
                    autosaveError: createErrorMessage(
                        error,
                        "Failed to save location order.",
                    ),
                });
            }
        },
        moveLocationInTree: async ({
            locationId,
            targetLocationId,
            dropMode,
        }) => {
            await enqueueLocationTreeMutation(async () => {
                const projectId = get().projectId.trim();
                if (!projectId) {
                    return;
                }

                const previousState = get();
                const previousLocations = previousState.locations;
                const previousProject = previousState.workspaceProject;

                if (!previousProject || locationId === targetLocationId) {
                    return;
                }

                const descendants = collectDescendantLocationIds(
                    locationId,
                    previousLocations,
                );
                if (descendants.has(targetLocationId)) {
                    set({
                        autosaveError:
                            "Cannot move a location relative to its own descendant.",
                    });
                    return;
                }

                const locationsById = new Map(
                    previousLocations.map((location) => [
                        location.id,
                        {
                            ...location,
                            sublocationIds: [...location.sublocationIds],
                        },
                    ]),
                );

                const sourceParentId = findParentLocationId(
                    locationId,
                    previousLocations,
                );
                const targetParentId = findParentLocationId(
                    targetLocationId,
                    previousLocations,
                );
                const destinationParentId =
                    dropMode === "inside" ? targetLocationId : targetParentId;

                const nextProject = {
                    ...previousProject,
                    locationIds: [...previousProject.locationIds],
                };

                const getContainer = (parentId: string | null): string[] => {
                    if (!parentId) {
                        return nextProject.locationIds;
                    }

                    const parent = locationsById.get(parentId);
                    if (!parent) {
                        throw new Error(
                            "Location parent not found while moving.",
                        );
                    }

                    return parent.sublocationIds;
                };

                const sourceContainer = getContainer(sourceParentId);
                const sourceIndex = sourceContainer.indexOf(locationId);
                if (sourceIndex === -1) {
                    return;
                }
                sourceContainer.splice(sourceIndex, 1);

                const destinationContainer = getContainer(destinationParentId);

                let insertIndex = destinationContainer.length;
                if (dropMode !== "inside") {
                    const targetIndex =
                        destinationContainer.indexOf(targetLocationId);
                    if (targetIndex === -1) {
                        return;
                    }

                    insertIndex =
                        dropMode === "before" ? targetIndex : targetIndex + 1;

                    if (
                        sourceContainer === destinationContainer &&
                        sourceIndex < insertIndex
                    ) {
                        insertIndex -= 1;
                    }
                }

                destinationContainer.splice(insertIndex, 0, locationId);

                nextProject.updatedAt = new Date();

                const nextLocations = Array.from(locationsById.values());

                if (
                    exceedsLocationNestingLimit(
                        nextProject.locationIds,
                        nextLocations,
                        MAX_LOCATION_NESTING_LEVEL,
                    )
                ) {
                    set({
                        autosaveError:
                            "Location nesting is limited to 5 levels in the editor.",
                    });
                    return;
                }

                set({
                    workspaceProject: nextProject,
                    locations: nextLocations,
                });

                const persistContainer = async (
                    parentId: string | null,
                    orderedLocationIds: string[],
                ) => {
                    await rendererApi.logistics.reorderLocationChildren({
                        projectId,
                        parentLocationId: parentId,
                        orderedLocationIds,
                    });
                };

                try {
                    if (sourceParentId !== destinationParentId) {
                        await rendererApi.logistics.saveLocationInfo({
                            projectId,
                            locationId,
                            payload: {
                                parentLocationId: destinationParentId,
                            },
                        });
                    }

                    const destinationOrder = [...destinationContainer];
                    // SaveLocationInfo already removes the item from its previous
                    // parent/root while preserving remaining order.
                    // Persist only the destination container to apply drop position.

                    await persistContainer(
                        destinationParentId,
                        destinationOrder,
                    );
                } catch (error) {
                    set({
                        workspaceProject: previousProject,
                        locations: previousLocations,
                        autosaveError: createErrorMessage(
                            error,
                            "Failed to move location in tree.",
                        ),
                    });
                }
            });
        },
        reorderOrganizations: async (newOrder) => {
            const projectId = get().projectId.trim();
            if (!projectId) return;

            set((state) => {
                const map = new Map(state.organizations.map((i) => [i.id, i]));
                const reordered = newOrder
                    .map((id) => map.get(id))
                    .filter((i): i is WorkspaceOrganization => !!i);
                return { organizations: reordered };
            });

            try {
                await rendererApi.project.reorderProjectItems({
                    projectId,
                    kind: "organization",
                    orderedIds: newOrder,
                });
            } catch (error) {
                set({
                    autosaveError: createErrorMessage(
                        error,
                        "Failed to save organization order.",
                    ),
                });
            }
        },
        renameDocument: async (kind, id, newTitle) => {
            const { projectId } = get();
            if (!projectId) return;

            // Optimistic update
            set((state) => {
                if (kind === "chapter") {
                    return {
                        chapters: state.chapters.map((c) =>
                            c.id === id ? { ...c, title: newTitle } : c,
                        ),
                    };
                } else if (kind === "character") {
                    return {
                        characters: state.characters.map((c) =>
                            c.id === id ? { ...c, name: newTitle } : c,
                        ),
                    };
                } else if (kind === "location") {
                    return {
                        locations: state.locations.map((l) =>
                            l.id === id ? { ...l, name: newTitle } : l,
                        ),
                    };
                } else if (kind === "organization") {
                    return {
                        organizations: state.organizations.map((o) =>
                            o.id === id ? { ...o, name: newTitle } : o,
                        ),
                    };
                } else if (kind === "scrapNote") {
                    return {
                        scrapNotes: state.scrapNotes.map((s) =>
                            s.id === id ? { ...s, title: newTitle } : s,
                        ),
                    };
                }
                return {};
            });

            const writePromise =
                kind === "chapter"
                    ? rendererApi.manuscript.renameChapter({
                          chapterId: id,
                          title: newTitle,
                      })
                    : kind === "character"
                      ? rendererApi.logistics.saveCharacterInfo({
                            characterId: id,
                            payload: { name: newTitle },
                        })
                      : kind === "location"
                        ? rendererApi.logistics.saveLocationInfo({
                              projectId,
                              locationId: id,
                              payload: { name: newTitle },
                          })
                        : kind === "organization"
                          ? rendererApi.logistics.saveOrganizationInfo({
                                organizationId: id,
                                payload: { name: newTitle },
                            })
                          : kind === "scrapNote"
                            ? rendererApi.manuscript.updateScrapNote({
                                  scrapNoteId: id,
                                  title: newTitle,
                              })
                            : Promise.resolve();

            runInBackground(writePromise, (error) => {
                const message =
                    createErrorMessage(
                        error,
                        "Failed to save rename to the cloud.",
                    ) +
                    "\n\nYour rename was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                set({ cloudSyncError: message });
                alert(message);
            });
        },
        setAutosaveStatus: (status) => {
            set({ autosaveStatus: status });
        },
        setAutosaveError: (message) => {
            set({ autosaveError: message });
        },
        setCloudSyncError: (message) => {
            set({ cloudSyncError: message });
        },
        setSyncStatus: (status) => {
            set({ syncStatus: status });
        },
        setLastSyncedAt: (timestamp) => {
            set({ lastSyncedAt: timestamp });
        },
        setPendingConflict: (conflict) => {
            set((state) => {
                if (!conflict) {
                    return {
                        pendingConflict: null,
                        pendingConflictQueue: [],
                    };
                }

                const queue = [...state.pendingConflictQueue, conflict];
                return {
                    pendingConflictQueue: queue,
                    pendingConflict: state.pendingConflict ?? queue[0],
                };
            });
        },
        resolveConflict: async (resolution) => {
            const { pendingConflict } = get();
            if (!pendingConflict) return;

            const conflictKey = getConflictKey(
                pendingConflict.entityType,
                pendingConflict.entityId,
            );

            try {
                recentlyResolvedConflicts.set(conflictKey, Date.now());

                if (resolution === "accept-remote") {
                    markAcceptedConflictOverwrite(
                        pendingConflict.entityType,
                        pendingConflict.entityId,
                    );
                }

                await syncEvents.resolveConflict(
                    pendingConflict.entityType,
                    pendingConflict.entityId,
                    pendingConflict.projectId,
                    resolution,
                );

                const stateAfterResolve = get();
                const selection = resolveConflictSelection(
                    stateAfterResolve,
                    pendingConflict,
                );

                if (
                    selection &&
                    documentExistsInState(stateAfterResolve, selection)
                ) {
                    const existsInTabs = stateAfterResolve.openTabs.some(
                        (tab) =>
                            tab.kind === selection.kind &&
                            tab.id === selection.id,
                    );

                    set((state) => ({
                        activeDocument: selection,
                        openTabs: existsInTabs
                            ? state.openTabs
                            : [...state.openTabs, selection],
                    }));
                }
            } catch (error) {
                recentlyResolvedConflicts.delete(conflictKey);
                acceptedConflictOverwrites.delete(
                    getConflictEntityKey(
                        pendingConflict.entityType,
                        pendingConflict.entityId,
                    ),
                );
                console.error("Failed to resolve conflict:", error);
            } finally {
                set((state) => {
                    const [, ...rest] = state.pendingConflictQueue;
                    return {
                        pendingConflictQueue: rest,
                        pendingConflict: rest[0] ?? null,
                    };
                });
            }
        },
        setLastSavedAt: (timestamp) => {
            set({ lastSavedAt: timestamp });
        },
        setShortcutState: (id, nextState) => {
            set((state) => ({
                shortcutStates: {
                    ...state.shortcutStates,
                    [id]: nextState,
                },
            }));
        },
        resetShortcutState: (id) => {
            set((state) => ({
                shortcutStates: {
                    ...state.shortcutStates,
                    [id]: { status: "idle" },
                },
            }));
        },
        currentSelection: null,
        setCurrentSelection: (selection) =>
            set({ currentSelection: selection }),
        markDocumentEditorDirty: (selection) => {
            const key = toWorkspaceDocumentKey(selection);
            set((state) => {
                if (state.dirtyDocumentEditors[key]) {
                    return state;
                }

                return {
                    dirtyDocumentEditors: {
                        ...state.dirtyDocumentEditors,
                        [key]: selection,
                    },
                };
            });
        },
        clearDocumentEditorDirty: (selection) => {
            const key = toWorkspaceDocumentKey(selection);
            set((state) => {
                if (!state.dirtyDocumentEditors[key]) {
                    return state;
                }

                const next = { ...state.dirtyDocumentEditors };
                delete next[key];

                return {
                    dirtyDocumentEditors: next,
                };
            });
        },
        setDraggedDocument: (doc) => {
            set({ draggedDocument: doc });
        },
        pendingTitleFocusDocument: null,
        consumePendingTitleFocus: (selection) => {
            const pending = get().pendingTitleFocusDocument;
            if (
                pending &&
                pending.kind === selection.kind &&
                pending.id === selection.id
            ) {
                set({ pendingTitleFocusDocument: null });
                return true;
            }
            return false;
        },
        renamingDocument: null,
        setRenamingDocument: (doc) => set({ renamingDocument: doc }),
        closeProject: () => {
            set(resetWorkspaceState());
        },
        isBinderOpen: true,
        toggleBinder: () => {
            set((state) => ({ isBinderOpen: !state.isBinderOpen }));
        },
        isChatOpen: false,
        toggleChat: () => {
            set((state) => ({ isChatOpen: !state.isChatOpen }));
        },

        pendingEditsByChapterId: {},
        pendingEditsById: {},
        archivedEditsById: {},
        dirtyDocumentEditors: {},
        addPendingEdits: (payload) => {
            const createdAt = Date.now();
            const pendingById: Record<string, PendingChapterEdit> = {};

            const comments: PendingChapterCommentEdit[] = (
                payload.comments ?? []
            )
                .map((item) => ({
                    id: generateOptimisticId(),
                    chapterId: item.chapterId,
                    kind: "comment" as const,
                    comment: item.comment,
                    wordNumberStart: item.wordNumberStart,
                    wordNumberEnd: item.wordNumberEnd,
                    originalText: item.originalText,
                    createdAt,
                }))
                .filter((item) => item.chapterId && item.comment?.trim());

            const replacements: PendingChapterReplacementEdit[] = (
                payload.replacements ?? []
            )
                .map((item) => ({
                    id: generateOptimisticId(),
                    chapterId: item.chapterId,
                    kind: "replacement" as const,
                    wordNumberStart: item.wordNumberStart,
                    wordNumberEnd: item.wordNumberEnd,
                    originalText: item.originalText,
                    replacementText: item.replacementText,
                    comment: item.comment,
                    createdAt,
                }))
                .filter(
                    (item) =>
                        item.chapterId &&
                        Number.isFinite(item.wordNumberStart) &&
                        Number.isFinite(item.wordNumberEnd) &&
                        item.wordNumberStart > 0 &&
                        item.wordNumberEnd >= item.wordNumberStart &&
                        item.originalText?.trim() &&
                        item.replacementText?.trim(),
                );

            for (const item of [...comments, ...replacements]) {
                pendingById[item.id] = item;
            }

            set((state) => {
                const nextByChapter = { ...state.pendingEditsByChapterId };

                for (const item of comments) {
                    const current = nextByChapter[item.chapterId] ?? {
                        comments: [],
                        replacements: [],
                    };
                    nextByChapter[item.chapterId] = {
                        ...current,
                        comments: [...current.comments, item],
                    };
                }

                for (const item of replacements) {
                    const current = nextByChapter[item.chapterId] ?? {
                        comments: [],
                        replacements: [],
                    };
                    nextByChapter[item.chapterId] = {
                        ...current,
                        replacements: [...current.replacements, item],
                    };
                }

                return {
                    pendingEditsByChapterId: nextByChapter,
                    pendingEditsById: {
                        ...state.pendingEditsById,
                        ...pendingById,
                    },
                };
            });
        },
        hasPendingEdits: () => {
            const pending = get().pendingEditsByChapterId;
            return Object.keys(pending).some((chapterId) => {
                const bucket = pending[chapterId];
                return (
                    (bucket?.comments?.length ?? 0) > 0 ||
                    (bucket?.replacements?.length ?? 0) > 0
                );
            });
        },
        hasPendingEditsForChapter: (chapterId) => {
            const bucket = get().pendingEditsByChapterId[chapterId];
            return (
                (bucket?.comments?.length ?? 0) > 0 ||
                (bucket?.replacements?.length ?? 0) > 0
            );
        },
        removePendingEdit: (editId) => {
            set((state) => {
                const edit = state.pendingEditsById[editId];
                if (!edit) {
                    return state;
                }

                const nextById = { ...state.pendingEditsById };
                delete nextById[editId];

                const chapterBucket =
                    state.pendingEditsByChapterId[edit.chapterId];
                if (!chapterBucket) {
                    return { pendingEditsById: nextById };
                }

                const nextBucket = {
                    comments:
                        edit.kind === "comment"
                            ? chapterBucket.comments.filter(
                                  (c) => c.id !== editId,
                              )
                            : chapterBucket.comments,
                    replacements:
                        edit.kind === "replacement"
                            ? chapterBucket.replacements.filter(
                                  (r) => r.id !== editId,
                              )
                            : chapterBucket.replacements,
                };

                const nextByChapter = { ...state.pendingEditsByChapterId };
                if (
                    nextBucket.comments.length === 0 &&
                    nextBucket.replacements.length === 0
                ) {
                    delete nextByChapter[edit.chapterId];
                } else {
                    nextByChapter[edit.chapterId] = nextBucket;
                }

                return {
                    pendingEditsById: nextById,
                    pendingEditsByChapterId: nextByChapter,
                };
            });
        },
        archivePendingEdit: (editId) => {
            set((state) => {
                const edit = state.pendingEditsById[editId];
                if (!edit) {
                    return state;
                }

                const nextById = { ...state.pendingEditsById };
                delete nextById[editId];

                const chapterBucket =
                    state.pendingEditsByChapterId[edit.chapterId];
                const nextByChapter = { ...state.pendingEditsByChapterId };

                if (chapterBucket) {
                    const nextBucket = {
                        comments:
                            edit.kind === "comment"
                                ? chapterBucket.comments.filter(
                                      (c) => c.id !== editId,
                                  )
                                : chapterBucket.comments,
                        replacements:
                            edit.kind === "replacement"
                                ? chapterBucket.replacements.filter(
                                      (r) => r.id !== editId,
                                  )
                                : chapterBucket.replacements,
                    };

                    if (
                        nextBucket.comments.length === 0 &&
                        nextBucket.replacements.length === 0
                    ) {
                        delete nextByChapter[edit.chapterId];
                    } else {
                        nextByChapter[edit.chapterId] = nextBucket;
                    }
                }

                return {
                    pendingEditsById: nextById,
                    pendingEditsByChapterId: nextByChapter,
                    archivedEditsById: {
                        ...state.archivedEditsById,
                        [editId]: edit,
                    },
                };
            });
        },
        restoreArchivedEdit: (editId) => {
            set((state) => {
                const edit = state.archivedEditsById[editId];
                if (!edit) {
                    return state;
                }

                const nextArchived = { ...state.archivedEditsById };
                delete nextArchived[editId];

                const nextByChapter = { ...state.pendingEditsByChapterId };
                const bucket = nextByChapter[edit.chapterId] ?? {
                    comments: [],
                    replacements: [],
                };

                nextByChapter[edit.chapterId] =
                    edit.kind === "comment"
                        ? {
                              ...bucket,
                              comments: [
                                  ...bucket.comments,
                                  edit as PendingChapterCommentEdit,
                              ],
                          }
                        : {
                              ...bucket,
                              replacements: [
                                  ...bucket.replacements,
                                  edit as PendingChapterReplacementEdit,
                              ],
                          };

                return {
                    archivedEditsById: nextArchived,
                    pendingEditsById: {
                        ...state.pendingEditsById,
                        [editId]: edit,
                    },
                    pendingEditsByChapterId: nextByChapter,
                };
            });
        },
        clearPendingEditsForChapter: (chapterId) => {
            set((state) => {
                const bucket = state.pendingEditsByChapterId[chapterId];
                if (!bucket) {
                    return state;
                }

                const nextById = { ...state.pendingEditsById };
                for (const item of [
                    ...bucket.comments,
                    ...bucket.replacements,
                ]) {
                    delete nextById[item.id];
                }

                const nextByChapter = { ...state.pendingEditsByChapterId };
                delete nextByChapter[chapterId];

                return {
                    pendingEditsByChapterId: nextByChapter,
                    pendingEditsById: nextById,
                };
            });
        },

        exportManuscript: async (request) => {
            return rendererApi.project.exportManuscript(request);
        },
        analyzeText: async (request) => {
            return rendererApi.analysis.analyzeText(request);
        },
        editChapters: async (request) => {
            return rendererApi.analysis.editChapters(request);
        },
        generalChat: async (request) => {
            return rendererApi.analysis.generalChat(request);
        },
        loadChatHistory: async (request) => {
            return rendererApi.analysis.loadChatHistory(request);
        },
        loadChatMessages: async (request) => {
            return rendererApi.analysis.loadChatMessages(request);
        },
        saveChapterContent: async (request) => {
            return rendererApi.logistics.saveChapterContent(request);
        },
        updateScrapNoteRemote: async (request) => {
            return rendererApi.manuscript.updateScrapNote(request);
        },
        saveCharacterInfo: async (request) => {
            return rendererApi.logistics.saveCharacterInfo(request);
        },
        saveLocationInfo: async (request) => {
            return rendererApi.logistics.saveLocationInfo(request);
        },
        reorderLocationChildren: async (request) => {
            return rendererApi.logistics.reorderLocationChildren(request);
        },
        saveOrganizationInfo: async (request) => {
            return rendererApi.logistics.saveOrganizationInfo(request);
        },
        listProjectMetafields: async (request) => {
            return rendererApi.metafield.listProjectMetafields(request);
        },
        createOrReuseMetafieldDefinition: async (request) => {
            return rendererApi.metafield.createOrReuseMetafieldDefinition(
                request,
            );
        },
        assignMetafieldToEntity: async (request) => {
            return rendererApi.metafield.assignMetafieldToEntity(request);
        },
        saveMetafieldValue: async (request) => {
            return rendererApi.metafield.saveMetafieldValue(request);
        },
        saveMetafieldSelectOptions: async (request) => {
            return rendererApi.metafield.saveMetafieldSelectOptions(request);
        },
        saveEditorTemplate: async (request) => {
            return rendererApi.metafield.saveEditorTemplate(request);
        },
        removeMetafieldFromEntity: async (request) => {
            return rendererApi.metafield.removeMetafieldFromEntity(request);
        },
        deleteMetafieldDefinitionGlobal: async (request) => {
            return rendererApi.metafield.deleteMetafieldDefinitionGlobal(
                request,
            );
        },
        submitBugReport: async (request) => {
            return rendererApi.support.submitBugReport(request);
        },
        importAsset: async (request) => {
            return rendererApi.asset.importAsset(request);
        },
        generateCharacterImage: async (request) => {
            return rendererApi.generation.generateCharacterImage(request);
        },
        generateCharacterSong: async (request) => {
            return rendererApi.generation.generateCharacterSong(request);
        },
        generateCharacterPlaylist: async (request) => {
            return rendererApi.generation.generateCharacterPlaylist(request);
        },
        generateLocationImage: async (request) => {
            return rendererApi.generation.generateLocationImage(request);
        },
        generateLocationSong: async (request) => {
            return rendererApi.generation.generateLocationSong(request);
        },
        generateLocationPlaylist: async (request) => {
            return rendererApi.generation.generateLocationPlaylist(request);
        },
        generateOrganizationImage: async (request) => {
            return rendererApi.generation.generateOrganizationImage(request);
        },
        generateOrganizationSong: async (request) => {
            return rendererApi.generation.generateOrganizationSong(request);
        },
        generateOrganizationPlaylist: async (request) => {
            return rendererApi.generation.generateOrganizationPlaylist(request);
        },
        createTimeline: async (params) => {
            try {
                const result = await rendererApi.timeline.createTimeline({
                    ...params,
                    timeUnit: "default",
                });
                if (result.timeline) {
                    const createdTimeline =
                        result.timeline as unknown as WorkspaceTimeline;
                    set((state) => ({
                        timelines: [...state.timelines, createdTimeline],
                    }));
                    return createdTimeline;
                }

                return null;
            } catch (error) {
                console.error("Failed to create timeline", error);
                return null;
            }
        },
        deleteTimeline: async (timelineId) => {
            const { projectId, timelines, selectedTimelineId } = get();
            try {
                await rendererApi.timeline.deleteTimeline({
                    timelineId,
                    projectId,
                });
                const newTimelines = timelines.filter(
                    (t) => t.id !== timelineId,
                );
                set({
                    timelines: newTimelines,
                    // If deleted timeline was selected, switch to Main
                    selectedTimelineId:
                        selectedTimelineId === timelineId
                            ? (newTimelines.find((t) => t.name === "Main")
                                  ?.id ?? null)
                            : selectedTimelineId,
                });
            } catch (error) {
                console.error("Failed to delete timeline", error);
                throw error;
            }
        },
        updateTimeline: async (params) => {
            const { timelines } = get();
            try {
                await rendererApi.timeline.updateTimeline(params);
                // Update the local timeline state
                set({
                    timelines: timelines.map((t) =>
                        t.id === params.timelineId
                            ? {
                                  ...t,
                                  ...(params.name !== undefined && {
                                      name: params.name,
                                  }),
                                  ...(params.description !== undefined && {
                                      description: params.description,
                                  }),
                                  ...(params.timeUnit !== undefined && {
                                      timeUnit: params.timeUnit,
                                  }),
                                  ...(params.startValue !== undefined && {
                                      startValue: params.startValue,
                                  }),
                              }
                            : t,
                    ),
                });
            } catch (error) {
                console.error("Failed to update timeline", error);
                throw error;
            }
        },
        setSelectedTimelineId: (timelineId) => {
            set({ selectedTimelineId: timelineId });
        },
        createEvent: async (params) => {
            try {
                const result = await rendererApi.timeline.createEvent(params);
                if (result.event) {
                    set((state) => ({
                        events: [
                            ...state.events,
                            result.event as unknown as WorkspaceEvent,
                        ],
                    }));
                }
            } catch (error) {
                console.error("Failed to create event", error);
            }
        },
        deleteEvent: async (params) => {
            try {
                await rendererApi.timeline.deleteEvent(params);
                set((state) => ({
                    events: state.events.filter((e) => e.id !== params.eventId),
                }));
            } catch (error) {
                console.error("Failed to delete event", error);
                throw error;
            }
        },
        updateEvent: async (params) => {
            try {
                const result = await rendererApi.timeline.updateEvent(params);
                if (result.event) {
                    set((state) => ({
                        events: state.events.map((e) =>
                            e.id === params.eventId
                                ? (result.event as unknown as WorkspaceEvent)
                                : e,
                        ),
                    }));
                }
            } catch (error) {
                console.error("Failed to update event", error);
                throw error;
            }
        },
        saveUserSettings: async (request) => {
            return rendererApi.logistics.saveUserSettings(request);
        },
        updateAccountEmail: async (request) => {
            return rendererApi.auth.updateEmail(request);
        },
        updateAccountPassword: async (request) => {
            return rendererApi.auth.updatePassword(request);
        },
        globalFind: async (request) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Project is not open.");
            }

            if (request.projectId.trim() !== projectId) {
                throw new Error("Search request project mismatch.");
            }

            const term = request.term.trim();
            if (!term) {
                return { totalOccurrences: 0, results: [] };
            }

            const normalizeLabel = (
                value: string | null | undefined,
                fallback: string,
            ): string => {
                const trimmed = value?.trim();
                return trimmed ? trimmed : fallback;
            };

            const joinParts = (
                parts: Array<string | null | undefined>,
            ): string => {
                return parts
                    .filter(
                        (p): p is string =>
                            typeof p === "string" && p.trim().length > 0,
                    )
                    .join("\n");
            };

            // Ordering: binder section order, then relative order within each section.
            // NOTE: The product spec mentioned "chapters -> scrap note -> chapter -> location -> organization".
            // We treat the second "chapter" as "character" to match the binder sections and icon examples.
            const chapterDocs = get()
                .chapters.slice()
                .sort((a, b) => a.order - b.order)
                .map((chapter, index) => ({
                    kind: "chapter" as const,
                    id: chapter.id,
                    title: `${chapter.order + 1}. ${normalizeLabel(
                        chapter.title,
                        "Untitled Chapter",
                    )}`,
                    content: chapter.content,
                    contentFormat: "tiptap-json" as const,
                    binderIndex: index,
                }));

            const scrapNoteDocs = get().scrapNotes.map((note, index) => ({
                kind: "scrapNote" as const,
                id: note.id,
                title: normalizeLabel(note.title, "Untitled Note"),
                content: note.content,
                contentFormat: "tiptap-json" as const,
                binderIndex: index,
            }));

            const characterDocs = get().characters.map((character, index) => ({
                kind: "character" as const,
                id: character.id,
                title: normalizeLabel(character.name, "Untitled Character"),
                content: joinParts([character.name, character.description]),
                contentFormat: "plain" as const,
                binderIndex: index,
            }));

            const locationDocs = get().locations.map((location, index) => ({
                kind: "location" as const,
                id: location.id,
                title: normalizeLabel(location.name, "Untitled Location"),
                content: joinParts([location.name, location.description]),
                contentFormat: "plain" as const,
                binderIndex: index,
            }));

            const organizationDocs = get().organizations.map((org, index) => ({
                kind: "organization" as const,
                id: org.id,
                title: normalizeLabel(org.name, "Untitled Organization"),
                content: joinParts([org.name, org.description]),
                contentFormat: "plain" as const,
                binderIndex: index,
            }));

            const docs: SearchDocumentSnapshot[] = [
                ...chapterDocs,
                ...scrapNoteDocs,
                ...characterDocs,
                ...locationDocs,
                ...organizationDocs,
            ];

            return globalSearchEngine.globalFind({
                docs,
                term,
                caseSensitive: request.caseSensitive ?? false,
            });
        },
        globalFindAndReplace: async (request) => {
            const currentProjectId = get().projectId.trim();
            if (!currentProjectId) {
                throw new Error("Project is not open.");
            }

            if (request.projectId.trim() !== currentProjectId) {
                throw new Error("Find/replace request project mismatch.");
            }

            const find = request.find;
            if (!find) {
                throw new Error("Find term cannot be empty.");
            }

            const escapeRegExp = (term: string): string => {
                return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            };

            const flags = request.caseSensitive ? "g" : "gi";
            const regex = new RegExp(escapeRegExp(find), flags);

            const replaceInJson = (
                node: unknown,
                regex: RegExp,
                replaceText: string,
            ): number => {
                let count = 0;

                if (!node || typeof node !== "object") {
                    return 0;
                }

                const candidate = node as {
                    type?: unknown;
                    text?: unknown;
                    content?: unknown;
                };

                if (
                    candidate.type === "text" &&
                    typeof candidate.text === "string"
                ) {
                    const matches = candidate.text.match(regex);
                    if (matches && matches.length > 0) {
                        count += matches.length;
                        const replaced = candidate.text.replace(
                            regex,
                            replaceText,
                        );
                        (node as { text?: string }).text = replaced;
                    }
                    return count;
                }

                if (Array.isArray(candidate.content)) {
                    for (const child of candidate.content) {
                        count += replaceInJson(child, regex, replaceText);
                    }
                }
                return count;
            };

            let replacements = 0;

            for (const chapter of get().chapters) {
                let newContent = chapter.content;
                let matchCount = 0;

                try {
                    const json = JSON.parse(chapter.content);
                    matchCount = replaceInJson(json, regex, request.replace);
                    if (matchCount > 0) {
                        newContent = JSON.stringify(json);
                    }
                } catch {
                    const matches = chapter.content.match(regex);
                    if (matches && matches.length > 0) {
                        matchCount = matches.length;
                        newContent = chapter.content.replace(
                            regex,
                            request.replace,
                        );
                    }
                }

                if (matchCount > 0) {
                    replacements += matchCount;
                    get().updateChapterLocally(chapter.id, {
                        content: newContent,
                        updatedAt: new Date(),
                    });
                    await get().saveChapterContent({
                        chapterId: chapter.id,
                        content: newContent,
                    });
                }
            }

            for (const note of get().scrapNotes) {
                let newContent = note.content;
                let matchCount = 0;

                try {
                    const json = JSON.parse(note.content);
                    matchCount = replaceInJson(json, regex, request.replace);
                    if (matchCount > 0) {
                        newContent = JSON.stringify(json);
                    }
                } catch {
                    const matches = note.content.match(regex);
                    if (matches && matches.length > 0) {
                        matchCount = matches.length;
                        newContent = note.content.replace(
                            regex,
                            request.replace,
                        );
                    }
                }

                if (matchCount > 0) {
                    replacements += matchCount;
                    get().updateScrapNoteLocally(note.id, {
                        content: newContent,
                        updatedAt: new Date(),
                    });
                    await get().updateScrapNoteRemote({
                        scrapNoteId: note.id,
                        content: newContent,
                    });
                }
            }

            if (replacements > 0) {
                get().setLastSavedAt(Date.now());
            }

            return { replacements };
        },
        setWorkspaceViewMode: (mode: WorkspaceViewMode) => {
            set({ workspaceViewMode: mode });
        },

        openSettings: () => {
            const currentStage = get().stage;
            // Don't save settings as previous stage
            if (currentStage !== "settings") {
                set({ previousStage: currentStage });
            }
            set({ stage: "settings" });
        },
        closeSettings: () => {
            const previousStage = get().previousStage;
            // Default to projectSelect if no previous stage or if it was an auth-related stage
            if (
                previousStage &&
                previousStage !== "checkingSession" &&
                previousStage !== "auth"
            ) {
                set({ stage: previousStage, previousStage: null });
            } else {
                set({ stage: "projectSelect", previousStage: null });
            }
        },
    };
});
