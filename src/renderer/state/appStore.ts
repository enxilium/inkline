import { create } from "zustand";

import type { RendererApi } from "../../@interface-adapters/controllers/contracts";
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
    WorkspaceImageAsset,
} from "../types";

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

const rendererApi = getRendererApi();
const authEvents = getAuthEvents();
let unsubscribeAuthState: (() => void) | null = null;

const createErrorMessage = (error: unknown, fallback: string): string => {
    return (error as Error)?.message ?? fallback;
};

const generateOptimisticId = (): string => {
    // Electron renderer supports Web Crypto in modern versions.
    const cryptoRef = (globalThis as unknown as { crypto?: Crypto }).crypto;
    if (cryptoRef?.randomUUID) {
        return cryptoRef.randomUUID();
    }

    // Fallback: keep collision probability extremely low.
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const runInBackground = (
    promise: Promise<unknown>,
    onError: (error: unknown) => void
): void => {
    promise.catch(onError);
};

const documentExists = (
    payload: OpenProjectPayload,
    selection: WorkspaceDocumentRef | null
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
                (item) => item.id === selection.id
            );
        default:
            return false;
    }
};

const createDefaultSelection = (
    payload: OpenProjectPayload
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
    preferred?: WorkspaceDocumentRef | null
): WorkspaceDocumentRef | null => {
    if (preferred && documentExists(payload, preferred)) {
        return preferred;
    }
    return createDefaultSelection(payload);
};

const patchEntity = <T extends { id: string }>(
    list: T[],
    entityId: string,
    patch: Partial<T>
): T[] =>
    list.map((entity) =>
        entity.id === entityId ? { ...entity, ...patch } : entity
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
    activeProjectName: string;
    projectId: string;
    workspaceProject: WorkspaceProject | null;
    chapters: WorkspaceChapter[];
    characters: WorkspaceCharacter[];
    locations: WorkspaceLocation[];
    organizations: WorkspaceOrganization[];
    scrapNotes: WorkspaceScrapNote[];
    assets: WorkspaceAssets;
    activeDocument: WorkspaceDocumentRef | null;
    openTabs: WorkspaceDocumentRef[];
    autosaveStatus: AutosaveStatus;
    autosaveError: string | null;
    cloudSyncError: string | null;
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
    bootstrapSession: () => Promise<void>;
    setAuthField: (field: keyof typeof initialAuthForm, value: string) => void;
    toggleAuthMode: () => void;
    submitAuth: () => Promise<void>;
    loadProjects: (userId?: string) => Promise<void>;
    setProjectsError: (message: string | null) => void;
    createProject: (params: { title: string }) => Promise<void>;
    openProject: (project: ProjectSummary) => Promise<void>;
    reloadActiveProject: () => Promise<void>;
    setProjectSelectionError: (message: string | null) => void;
    returnToProjects: () => Promise<void>;
    logout: () => Promise<void>;
    setActiveDocument: (selection: WorkspaceDocumentRef) => void;
    closeTab: (selection: WorkspaceDocumentRef) => void;
    reorderTabs: (newOrder: WorkspaceDocumentRef[]) => void;
    updateChapterLocally: (
        chapterId: string,
        patch: Partial<WorkspaceChapter>
    ) => void;
    updateScrapNoteLocally: (
        scrapNoteId: string,
        patch: Partial<WorkspaceScrapNote>
    ) => void;
    updateCharacterLocally: (
        characterId: string,
        patch: Partial<WorkspaceCharacter>
    ) => void;
    updateLocationLocally: (
        locationId: string,
        patch: Partial<WorkspaceLocation>
    ) => void;
    updateOrganizationLocally: (
        organizationId: string,
        patch: Partial<WorkspaceOrganization>
    ) => void;
    createChapterEntry: (order?: number) => Promise<void>;
    createScrapNoteEntry: () => Promise<void>;
    createCharacterEntry: () => Promise<void>;
    createLocationEntry: () => Promise<void>;
    createOrganizationEntry: () => Promise<void>;
    deleteProject: (projectId: string) => Promise<void>;
    deleteChapter: (chapterId: string) => Promise<void>;
    deleteScrapNote: (scrapNoteId: string) => Promise<void>;
    deleteCharacter: (characterId: string) => Promise<void>;
    deleteLocation: (locationId: string) => Promise<void>;
    deleteOrganization: (organizationId: string) => Promise<void>;
    reorderChapters: (newOrder: string[]) => Promise<void>;
    reorderScrapNotes: (newOrder: string[]) => Promise<void>;
    reorderCharacters: (newOrder: string[]) => Promise<void>;
    reorderLocations: (newOrder: string[]) => Promise<void>;
    reorderOrganizations: (newOrder: string[]) => Promise<void>;
    renameDocument: (
        kind: string,
        id: string,
        newTitle: string
    ) => Promise<void>;
    setAutosaveStatus: (status: AutosaveStatus) => void;
    setAutosaveError: (message: string | null) => void;
    setCloudSyncError: (message: string | null) => void;
    setLastSavedAt: (timestamp: number | null) => void;
    setShortcutState: (id: string, state: ShortcutStates[string]) => void;
    resetShortcutState: (id: string) => void;
    setDraggedDocument: (
        doc: { id: string; kind: string; title: string } | null
    ) => void;
    toggleBinder: () => void;
    toggleChat: () => void;
    flushActiveDocumentContent: () => Promise<void>;

    // IPC wrappers: keep renderer calls centralized here.
    exportManuscript: RendererApi["project"]["exportManuscript"];
    analyzeText: RendererApi["analysis"]["analyzeText"];
    editChapters: RendererApi["analysis"]["editChapters"];
    generalChat: RendererApi["analysis"]["generalChat"];
    saveChapterContent: RendererApi["logistics"]["saveChapterContent"];
    updateScrapNoteRemote: RendererApi["manuscript"]["updateScrapNote"];
    saveCharacterInfo: RendererApi["logistics"]["saveCharacterInfo"];
    saveLocationInfo: RendererApi["logistics"]["saveLocationInfo"];
    saveOrganizationInfo: RendererApi["logistics"]["saveOrganizationInfo"];
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
    saveUserSettings: RendererApi["logistics"]["saveUserSettings"];
    updateAccountEmail: RendererApi["auth"]["updateEmail"];
    updateAccountPassword: RendererApi["auth"]["updatePassword"];
    globalFind: (request: GlobalFindRequest) => Promise<GlobalFindResponse>;
    globalFindAndReplace: (
        request: GlobalFindAndReplaceRequest
    ) => Promise<GlobalFindAndReplaceResponse>;
};

export const useAppStore = create<AppStore>((set, get) => {
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
        | "assets"
        | "activeDocument"
        | "openTabs"
        | "autosaveStatus"
        | "autosaveError"
        | "cloudSyncError"
        | "lastSavedAt"
        | "pendingEditsByChapterId"
        | "pendingEditsById"
        | "archivedEditsById"
    > => ({
        projectId: "",
        activeProjectName: "",
        workspaceProject: null,
        chapters: [] as WorkspaceChapter[],
        characters: [] as WorkspaceCharacter[],
        locations: [] as WorkspaceLocation[],
        organizations: [] as WorkspaceOrganization[],
        scrapNotes: [] as WorkspaceScrapNote[],
        assets: emptyAssets,
        activeDocument: null as WorkspaceDocumentRef | null,
        openTabs: [] as WorkspaceDocumentRef[],
        autosaveStatus: defaultAutosaveStatus,
        autosaveError: null,
        cloudSyncError: null,
        lastSavedAt: null,
        pendingEditsByChapterId: {},
        pendingEditsById: {},
        archivedEditsById: {},
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

    const confirmDiscardPendingEdits = (): boolean => {
        const pendingCount = Object.keys(get().pendingEditsById).length;
        if (pendingCount === 0) {
            return true;
        }

        return window.confirm(
            "You have pending chapter edits that are not saved and will be lost. Continue?"
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

    const loadProjectWorkspace = async (
        targetProjectId: string,
        preferredSelection?: WorkspaceDocumentRef | null
    ) => {
        const payload = await rendererApi.project.openProject({
            projectId: targetProjectId,
        });
        const indexedAssets = indexAssets(payload.assets);
        const nextSelection = resolveDocumentSelection(
            payload,
            preferredSelection ?? get().activeDocument
        );
        set({
            projectId: payload.project.id,
            activeProjectName: payload.project.title,
            workspaceProject: payload.project,
            chapters: payload.chapters,
            characters: payload.characters,
            locations: payload.locations,
            organizations: payload.organizations,
            scrapNotes: payload.scrapNotes,
            assets: indexedAssets,
            activeDocument: nextSelection,
            openTabs: nextSelection ? [nextSelection] : [],
            stage: "workspace",
            autosaveStatus: defaultAutosaveStatus,
            autosaveError: null,
            lastSavedAt: null,
        });
        return payload;
    };

    return {
        stage: "checkingSession",
        authMode: "login",
        authForm: initialAuthForm,
        authError: null,
        isAuthSubmitting: false,
        user: null,
        currentUserId: "",
        projects: [],
        projectCovers: {},
        projectsStatus: "idle",
        projectsError: null,
        projectSelectionError: null,
        openingProjectId: null,
        activeProjectName: "",
        projectId: "",
        workspaceProject: null,
        chapters: [],
        characters: [],
        locations: [],
        organizations: [],
        scrapNotes: [],
        assets: emptyAssets,
        activeDocument: null,
        openTabs: [],
        autosaveStatus: defaultAutosaveStatus,
        autosaveError: null,
        cloudSyncError: null,
        lastSavedAt: null,
        draggedDocument: null,
        shortcutStates: defaultShortcutStates,
        bootstrapSession: async () => {
            ensureAuthSubscription();
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
        toggleAuthMode: () => {
            set((state) => ({
                authMode: state.authMode === "login" ? "register" : "login",
                authError: null,
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
                    authError: createErrorMessage(
                        error,
                        "Unable to complete request."
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
                        "Unable to load projects."
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
                await rendererApi.project.createProject({
                    userId: user.id,
                    title,
                });
                await get().loadProjects(user.id);
            } catch (error) {
                set({
                    projectsError: createErrorMessage(
                        error,
                        "Failed to create project."
                    ),
                });
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
                        "Unable to open project."
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
                    (c) => c.id === selection.id
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
                    (s) => s.id === selection.id
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
                        "Failed to save before leaving the project."
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
        setActiveDocument: (selection) => {
            set((state) => {
                const exists = state.openTabs.some(
                    (tab) =>
                        tab.kind === selection.kind && tab.id === selection.id
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
                        )
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
                    patch
                ),
            }));
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
                    (t) => t.kind === "chapter" && t.id === id
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
                            "Failed to save new chapter to the cloud."
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                }
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
                        createdAt: now,
                        updatedAt: now,
                    },
                ];

                const nextTab: WorkspaceDocumentRef = {
                    kind: "scrapNote",
                    id,
                };
                const nextTabs = state.openTabs.some(
                    (t) => t.kind === "scrapNote" && t.id === id
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
                            "Failed to save new scrap note to the cloud."
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                }
            );
        },
        createCharacterEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating characters.");
            }

            const now = new Date();
            const id = generateOptimisticId();

            set((state) => {
                const nextCharacters = [
                    ...state.characters,
                    {
                        id,
                        name: "",
                        race: "",
                        age: null,
                        description: "",
                        currentLocationId: null,
                        backgroundLocationId: null,
                        organizationId: null,
                        traits: [],
                        goals: [],
                        secrets: [],
                        tags: [],
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
                    (t) => t.kind === "character" && t.id === id
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
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.world.createCharacter({ projectId, id }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new character to the cloud."
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                }
            );
        },
        createLocationEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating locations.");
            }

            const now = new Date();
            const id = generateOptimisticId();

            set((state) => {
                const nextLocations = [
                    ...state.locations,
                    {
                        id,
                        name: "",
                        description: "",
                        culture: "",
                        history: "",
                        conflicts: [],
                        tags: [],
                        createdAt: now,
                        updatedAt: now,
                        bgmId: null,
                        playlistId: null,
                        galleryImageIds: [],
                        characterIds: [],
                        organizationIds: [],
                    },
                ];

                const nextTab: WorkspaceDocumentRef = {
                    kind: "location",
                    id,
                };
                const nextTabs = state.openTabs.some(
                    (t) => t.kind === "location" && t.id === id
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
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.world.createLocation({ projectId, id }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new location to the cloud."
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                }
            );
        },
        createOrganizationEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error(
                    "Open a project before creating organizations."
                );
            }

            const now = new Date();
            const id = generateOptimisticId();

            set((state) => {
                const nextOrganizations = [
                    ...state.organizations,
                    {
                        id,
                        name: "",
                        description: "",
                        mission: "",
                        tags: [],
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
                    (t) => t.kind === "organization" && t.id === id
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
                    activeDocument: nextTab,
                    openTabs: nextTabs,
                };
            });

            runInBackground(
                rendererApi.world.createOrganization({ projectId, id }),
                (error) => {
                    const message =
                        createErrorMessage(
                            error,
                            "Failed to save new organization to the cloud."
                        ) +
                        "\n\nYour change was applied locally, but was NOT saved to the cloud. Please check your internet connection and try again.";
                    set({ cloudSyncError: message });
                    alert(message);
                }
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
                        "Failed to delete project."
                    ),
                });
            }
        },
        deleteChapter: async (chapterId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting chapters.");
            }

            await rendererApi.manuscript.deleteChapter({
                projectId,
                chapterId,
            });

            set((state) => {
                const filtered = state.chapters.filter(
                    (c) => c.id !== chapterId
                );

                // Re-index orders to close the gap
                const nextChapters = filtered
                    .sort((a, b) => a.order - b.order)
                    .map((c, index) => ({ ...c, order: index }));

                const nextTabs = state.openTabs.filter(
                    (t) => !(t.kind === "chapter" && t.id === chapterId)
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
                return {
                    chapters: nextChapters,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });
        },
        deleteScrapNote: async (scrapNoteId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting scrap notes.");
            }

            await rendererApi.manuscript.deleteScrapNote({
                projectId,
                scrapNoteId,
            });

            set((state) => {
                const nextNotes = state.scrapNotes.filter(
                    (n) => n.id !== scrapNoteId
                );
                const nextTabs = state.openTabs.filter(
                    (t) => !(t.kind === "scrapNote" && t.id === scrapNoteId)
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
                return {
                    scrapNotes: nextNotes,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });
        },
        deleteCharacter: async (characterId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting characters.");
            }

            await rendererApi.world.deleteCharacter({
                projectId,
                characterId,
            });

            set((state) => {
                const nextCharacters = state.characters.filter(
                    (c) => c.id !== characterId
                );
                const nextTabs = state.openTabs.filter(
                    (t) => !(t.kind === "character" && t.id === characterId)
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
                return {
                    characters: nextCharacters,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });
        },
        deleteLocation: async (locationId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before deleting locations.");
            }

            await rendererApi.world.deleteLocation({
                projectId,
                locationId,
            });

            set((state) => {
                const nextLocations = state.locations.filter(
                    (l) => l.id !== locationId
                );
                const nextTabs = state.openTabs.filter(
                    (t) => !(t.kind === "location" && t.id === locationId)
                );
                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === "location" &&
                    state.activeDocument.id === locationId
                ) {
                    nextActive =
                        nextTabs.length > 0
                            ? nextTabs[nextTabs.length - 1]
                            : null;
                }
                return {
                    locations: nextLocations,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });
        },
        deleteOrganization: async (organizationId) => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error(
                    "Open a project before deleting organizations."
                );
            }

            await rendererApi.world.deleteOrganization({
                projectId,
                organizationId,
            });

            set((state) => {
                const nextOrgs = state.organizations.filter(
                    (o) => o.id !== organizationId
                );
                const nextTabs = state.openTabs.filter(
                    (t) =>
                        !(t.kind === "organization" && t.id === organizationId)
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
                return {
                    organizations: nextOrgs,
                    activeDocument: nextActive,
                    openTabs: nextTabs,
                };
            });
        },
        reorderChapters: async (newOrder) => {
            const projectId = get().projectId.trim();
            if (!projectId) return;

            // Optimistic update
            set((state) => {
                const chapterMap = new Map(
                    state.chapters.map((c) => [c.id, c])
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
                        "Failed to save chapter order."
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
                        "Failed to save scrap note order."
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
                        "Failed to save character order."
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
                        "Failed to save location order."
                    ),
                });
            }
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
                        "Failed to save organization order."
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
                            c.id === id ? { ...c, title: newTitle } : c
                        ),
                    };
                } else if (kind === "character") {
                    return {
                        characters: state.characters.map((c) =>
                            c.id === id ? { ...c, name: newTitle } : c
                        ),
                    };
                } else if (kind === "location") {
                    return {
                        locations: state.locations.map((l) =>
                            l.id === id ? { ...l, name: newTitle } : l
                        ),
                    };
                } else if (kind === "organization") {
                    return {
                        organizations: state.organizations.map((o) =>
                            o.id === id ? { ...o, name: newTitle } : o
                        ),
                    };
                } else if (kind === "scrapNote") {
                    return {
                        scrapNotes: state.scrapNotes.map((s) =>
                            s.id === id ? { ...s, title: newTitle } : s
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
                        "Failed to save rename to the cloud."
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
        setDraggedDocument: (doc) => {
            set({ draggedDocument: doc });
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
                        item.replacementText?.trim()
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
                                  (c) => c.id !== editId
                              )
                            : chapterBucket.comments,
                    replacements:
                        edit.kind === "replacement"
                            ? chapterBucket.replacements.filter(
                                  (r) => r.id !== editId
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
                                      (c) => c.id !== editId
                                  )
                                : chapterBucket.comments,
                        replacements:
                            edit.kind === "replacement"
                                ? chapterBucket.replacements.filter(
                                      (r) => r.id !== editId
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
        saveOrganizationInfo: async (request) => {
            return rendererApi.logistics.saveOrganizationInfo(request);
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
                fallback: string
            ): string => {
                const trimmed = value?.trim();
                return trimmed ? trimmed : fallback;
            };

            const joinParts = (
                parts: Array<string | null | undefined>
            ): string => {
                return parts
                    .filter(
                        (p): p is string =>
                            typeof p === "string" && p.trim().length > 0
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
                        "Untitled Chapter"
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
                content: joinParts([
                    character.name,
                    character.race,
                    character.age != null ? String(character.age) : "",
                    character.description,
                    ...(character.traits ?? []),
                    ...(character.goals ?? []),
                    ...(character.secrets ?? []),
                    ...(character.tags ?? []),
                ]),
                contentFormat: "plain" as const,
                binderIndex: index,
            }));

            const locationDocs = get().locations.map((location, index) => ({
                kind: "location" as const,
                id: location.id,
                title: normalizeLabel(location.name, "Untitled Location"),
                content: joinParts([
                    location.name,
                    location.description,
                    location.culture,
                    location.history,
                    ...(location.conflicts ?? []),
                    ...(location.tags ?? []),
                ]),
                contentFormat: "plain" as const,
                binderIndex: index,
            }));

            const organizationDocs = get().organizations.map((org, index) => ({
                kind: "organization" as const,
                id: org.id,
                title: normalizeLabel(org.name, "Untitled Organization"),
                content: joinParts([
                    org.name,
                    org.description,
                    org.mission,
                    ...(org.tags ?? []),
                ]),
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
                replaceText: string
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
                            replaceText
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
                            request.replace
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
                            request.replace
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
        openSettings: () => {
            set({ stage: "settings" });
        },
    };
});
