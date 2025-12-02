import { create } from "zustand";

import { ensureAuthEvents, ensureRendererApi } from "../utils/api";
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

const rendererApi = ensureRendererApi();
const authEvents = ensureAuthEvents();
let unsubscribeAuthState: (() => void) | null = null;

const createErrorMessage = (error: unknown, fallback: string): string => {
    return (error as Error)?.message ?? fallback;
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

type AppStore = {
    stage: AppStage;
    authMode: AuthMode;
    authForm: typeof initialAuthForm;
    authError: string | null;
    isAuthSubmitting: boolean;
    user: RendererUser | null;
    currentUserId: string;
    projects: ProjectSummary[];
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
    lastSavedAt: number | null;
    shortcutStates: ShortcutStates;
    draggedDocument: { id: string; kind: string; title: string } | null;
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
    setAutosaveStatus: (status: AutosaveStatus) => void;
    setAutosaveError: (message: string | null) => void;
    setLastSavedAt: (timestamp: number | null) => void;
    setShortcutState: (id: string, state: ShortcutStates[string]) => void;
    resetShortcutState: (id: string) => void;
    setDraggedDocument: (doc: { id: string; kind: string; title: string } | null) => void;
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
        | "lastSavedAt"
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
        lastSavedAt: null,
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
                set({ projects: [], projectsStatus: "idle" });
                return;
            }

            set({ projectsStatus: "loading", projectsError: null });
            try {
                const response = await rendererApi.project.loadProjectList({
                    userId: resolvedUserId,
                });
                set({ projects: response.projects, projectsStatus: "idle" });
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
            await loadProjectWorkspace(projectId);
        },
        setProjectSelectionError: (message) => {
            set({ projectSelectionError: message });
        },
        returnToProjects: async () => {
            const { user } = get();
            if (!user) {
                return;
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
            try {
                await rendererApi.auth.logoutUser();
            } catch (_error) {
                // Ignore logout failures locally; intent is to clear session.
            }
        },
        setActiveDocument: (selection) => {
            set((state) => {
                const exists = state.openTabs.some(
                    (tab) => tab.kind === selection.kind && tab.id === selection.id
                );
                return {
                    activeDocument: selection,
                    openTabs: exists ? state.openTabs : [...state.openTabs, selection],
                };
            });
        },
        closeTab: (selection) => {
            set((state) => {
                const newTabs = state.openTabs.filter(
                    (tab) => !(tab.kind === selection.kind && tab.id === selection.id)
                );
                
                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === selection.kind &&
                    state.activeDocument.id === selection.id
                ) {
                    nextActive = newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
                }

                return {
                    openTabs: newTabs,
                    activeDocument: nextActive,
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

            const insertionOrder =
                typeof order === "number" ? order : get().chapters.length;
            const response = await rendererApi.manuscript.createChapter({
                projectId,
                order: insertionOrder,
            });

            // Optimistic update: Append the new chapter directly to the store
            set((state) => ({
                chapters: [...state.chapters, response.chapter],
                activeDocument: { kind: "chapter", id: response.chapter.id },
                openTabs: [...state.openTabs, { kind: "chapter", id: response.chapter.id }],
            }));
        },
        createScrapNoteEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating scrap notes.");
            }

            const response = await rendererApi.manuscript.createScrapNote({
                projectId,
            });

            // Optimistic update: Append the new scrap note directly to the store
            set((state) => ({
                scrapNotes: [...state.scrapNotes, response.scrapNote],
                activeDocument: {
                    kind: "scrapNote",
                    id: response.scrapNote.id,
                },
                openTabs: [...state.openTabs, { kind: "scrapNote", id: response.scrapNote.id }],
            }));
        },
        createCharacterEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating characters.");
            }

            const response = await rendererApi.world.createCharacter({
                projectId,
            });

            // Optimistic update: Append the new character directly to the store
            set((state) => ({
                characters: [...state.characters, response.character],
                activeDocument: {
                    kind: "character",
                    id: response.character.id,
                },
                openTabs: [...state.openTabs, { kind: "character", id: response.character.id }],
            }));
        },
        createLocationEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error("Open a project before creating locations.");
            }

            const response = await rendererApi.world.createLocation({
                projectId,
            });

            // Optimistic update: Append the new location directly to the store
            set((state) => ({
                locations: [...state.locations, response.location],
                activeDocument: { kind: "location", id: response.location.id },
                openTabs: [...state.openTabs, { kind: "location", id: response.location.id }],
            }));
        },
        createOrganizationEntry: async () => {
            const projectId = get().projectId.trim();
            if (!projectId) {
                throw new Error(
                    "Open a project before creating organizations."
                );
            }

            const response = await rendererApi.world.createOrganization({
                projectId,
            });

            // Optimistic update: Append the new organization directly to the store
            set((state) => ({
                organizations: [...state.organizations, response.organization],
                activeDocument: {
                    kind: "organization",
                    id: response.organization.id,
                },
                openTabs: [...state.openTabs, { kind: "organization", id: response.organization.id }],
            }));
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
                    nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null;
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
                    nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null;
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
                    nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null;
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
                    nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null;
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
                    (t) => !(t.kind === "organization" && t.id === organizationId)
                );
                let nextActive = state.activeDocument;
                if (
                    state.activeDocument?.kind === "organization" &&
                    state.activeDocument.id === organizationId
                ) {
                    nextActive = nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null;
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
        setAutosaveStatus: (status) => {
            set({ autosaveStatus: status });
        },
        setAutosaveError: (message) => {
            set({ autosaveError: message });
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
    };
});
