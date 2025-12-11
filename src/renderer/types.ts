import type { RendererApi } from "../@interface-adapters/controllers/contracts";
import type { AuthStatePayload } from "../@interface-adapters/controllers/auth/AuthStateGateway";

export type RendererUser = AuthStatePayload["user"];

export type ProjectSummary = Awaited<
    ReturnType<RendererApi["project"]["loadProjectList"]>
>["projects"][number];

export type AppStage =
    | "checkingSession"
    | "auth"
    | "projectSelect"
    | "workspace"
    | "settings";

export type AuthMode = "login" | "register";

export type ProjectsStatus = "idle" | "loading" | "error";

export type AutosaveStatus =
    | "disabled"
    | "idle"
    | "pending"
    | "saving"
    | "saved"
    | "error";

export type ShortcutState = {
    status: "idle" | "running" | "success" | "error";
    message?: string;
};

export type ShortcutStates = Record<string, ShortcutState>;

export type OpenProjectPayload = Awaited<
    ReturnType<RendererApi["project"]["openProject"]>
>;

export type WorkspaceProject = OpenProjectPayload["project"];
export type WorkspaceChapter = OpenProjectPayload["chapters"][number];
export type WorkspaceCharacter = OpenProjectPayload["characters"][number];
export type WorkspaceLocation = OpenProjectPayload["locations"][number];
export type WorkspaceOrganization = OpenProjectPayload["organizations"][number];
export type WorkspaceScrapNote = OpenProjectPayload["scrapNotes"][number];
export type WorkspaceAssetBundle = OpenProjectPayload["assets"];
export type WorkspaceImageAsset = WorkspaceAssetBundle["images"][number];
export type WorkspaceBGMAsset = WorkspaceAssetBundle["bgms"][number];
export type WorkspacePlaylistAsset = WorkspaceAssetBundle["playlists"][number];

export type WorkspaceAssets = {
    images: Record<string, WorkspaceImageAsset>;
    bgms: Record<string, WorkspaceBGMAsset>;
    playlists: Record<string, WorkspacePlaylistAsset>;
};

export type WorkspaceDocumentKind =
    | "chapter"
    | "scrapNote"
    | "character"
    | "location"
    | "organization";

export type WorkspaceDocumentRef = {
    kind: WorkspaceDocumentKind;
    id: string;
};

export type UseCaseShortcut = {
    id: string;
    title: string;
    description: string;
    category: string;
    run: () => Promise<void>;
};
