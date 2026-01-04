import type { AnalyzeTextController } from "./analysis/AnalyzeTextController";
import type { EditChaptersController } from "./analysis/EditChaptersController";
import type { GeneralChatController } from "./analysis/GeneralChatController";
import type { LoadChatHistoryController } from "./analysis/LoadChatHistoryController";
import type { LoadChatMessagesController } from "./analysis/LoadChatMessagesController";
import type { DeleteAssetController } from "./asset/DeleteAssetController";
import type { ImportAssetController } from "./asset/ImportAssetController";
import type { LoginUserController } from "./auth/LoginUserController";
import type { LogoutUserController } from "./auth/LogoutUserController";
import type { RegisterUserController } from "./auth/RegisterUserController";
import type { GetAuthStateController } from "./auth/GetAuthStateController";
import type { UpdateUserEmailController } from "./auth/UpdateUserEmailController";
import type { UpdateUserPasswordController } from "./auth/UpdateUserPasswordController";
import type { GenerateCharacterImageController } from "./generation/GenerateCharacterImageController";
import type { GenerateCharacterPlaylistController } from "./generation/GenerateCharacterPlaylistController";
import type { GenerateCharacterSongController } from "./generation/GenerateCharacterSongController";
import type { GenerateLocationImageController } from "./generation/GenerateLocationImageController";
import type { GenerateLocationPlaylistController } from "./generation/GenerateLocationPlaylistController";
import type { GenerateLocationSongController } from "./generation/GenerateLocationSongController";
import type { GenerateOrganizationImageController } from "./generation/GenerateOrganizationImageController";
import type { GenerateOrganizationPlaylistController } from "./generation/GenerateOrganizationPlaylistController";
import type { GenerateOrganizationSongController } from "./generation/GenerateOrganizationSongController";
import type { SaveChapterContentController } from "./logistics/SaveChapterContentController";
import type { SaveCharacterInfoController } from "./logistics/SaveCharacterInfoController";
import type { SaveLocationInfoController } from "./logistics/SaveLocationInfoController";
import type { SaveManuscriptStructureController } from "./logistics/SaveManuscriptStructureController";
import type { SaveOrganizationInfoController } from "./logistics/SaveOrganizationInfoController";
import type { SaveProjectSettingsController } from "./logistics/SaveProjectSettingsController";
import type { SaveUserSettingsController } from "./logistics/SaveUserSettingsController";
import type { CreateChapterController } from "./manuscript/CreateChapterController";
import type { CreateScrapNoteController } from "./manuscript/CreateScrapNoteController";
import type { DeleteChapterController } from "./manuscript/DeleteChapterController";
import type { DeleteScrapNoteController } from "./manuscript/DeleteScrapNoteController";
import type { MoveChapterController } from "./manuscript/MoveChapterController";
import type { OverwriteChapterController } from "./manuscript/OverwriteChapterController";
import type { OverwriteScrapNoteController } from "./manuscript/OverwriteScrapNoteController";
import type { RenameChapterController } from "./manuscript/RenameChapterController";
import type { UpdateScrapNoteController } from "./manuscript/UpdateScrapNoteController";
import type { CreateProjectController } from "./project/CreateProjectController";
import type { DeleteProjectController } from "./project/DeleteProjectController";
import type { ExportManuscriptController } from "./project/ExportManuscriptController";
import type { LoadProjectListController } from "./project/LoadProjectListController";
import type { OpenProjectController } from "./project/OpenProjectController";
import type { ReorderProjectItemsController } from "./project/ReorderProjectItemsController";
import type { CreateCharacterController } from "./world/CreateCharacterController";
import type { CreateLocationController } from "./world/CreateLocationController";
import type { CreateOrganizationController } from "./world/CreateOrganizationController";
import type { DeleteCharacterController } from "./world/DeleteCharacterController";
import type { DeleteLocationController } from "./world/DeleteLocationController";
import type { DeleteOrganizationController } from "./world/DeleteOrganizationController";
import type { OverwriteCharacterController } from "./world/OverwriteCharacterController";
import type { OverwriteLocationController } from "./world/OverwriteLocationController";
import type { OverwriteOrganizationController } from "./world/OverwriteOrganizationController";
import type { CreateTimelineController } from "./timeline/CreateTimelineController";
import type { UpdateTimelineController } from "./timeline/UpdateTimelineController";
import type { DeleteTimelineController } from "./timeline/DeleteTimelineController";
import type { CreateEventController } from "./timeline/CreateEventController";
import type { UpdateEventController } from "./timeline/UpdateEventController";
import type { DeleteEventController } from "./timeline/DeleteEventController";
import type { GetSyncStateController } from "./sync/GetSyncStateController";

type Handler<T> = T extends {
    handle: (...args: infer P) => Promise<infer R>;
}
    ? (...args: P) => Promise<R>
    : never;

export interface ControllerInstanceMap {
    analysis: {
        analyzeText: AnalyzeTextController;
        editChapters: EditChaptersController;
        generalChat: GeneralChatController;
        loadChatHistory: LoadChatHistoryController;
        loadChatMessages: LoadChatMessagesController;
    };
    asset: {
        deleteAsset: DeleteAssetController;
        importAsset: ImportAssetController;
    };
    auth: {
        loginUser: LoginUserController;
        logoutUser: LogoutUserController;
        registerUser: RegisterUserController;
        getState: GetAuthStateController;
        updateEmail: UpdateUserEmailController;
        updatePassword: UpdateUserPasswordController;
    };
    generation: {
        generateCharacterImage: GenerateCharacterImageController;
        generateCharacterPlaylist: GenerateCharacterPlaylistController;
        generateCharacterSong: GenerateCharacterSongController;
        generateLocationImage: GenerateLocationImageController;
        generateLocationPlaylist: GenerateLocationPlaylistController;
        generateLocationSong: GenerateLocationSongController;
        generateOrganizationImage: GenerateOrganizationImageController;
        generateOrganizationPlaylist: GenerateOrganizationPlaylistController;
        generateOrganizationSong: GenerateOrganizationSongController;
    };
    logistics: {
        saveChapterContent: SaveChapterContentController;
        saveCharacterInfo: SaveCharacterInfoController;
        saveLocationInfo: SaveLocationInfoController;
        saveManuscriptStructure: SaveManuscriptStructureController;
        saveOrganizationInfo: SaveOrganizationInfoController;
        saveProjectSettings: SaveProjectSettingsController;
        saveUserSettings: SaveUserSettingsController;
    };
    manuscript: {
        createChapter: CreateChapterController;
        createScrapNote: CreateScrapNoteController;
        deleteChapter: DeleteChapterController;
        deleteScrapNote: DeleteScrapNoteController;
        moveChapter: MoveChapterController;
        overwriteChapter: OverwriteChapterController;
        overwriteScrapNote: OverwriteScrapNoteController;
        renameChapter: RenameChapterController;
        updateScrapNote: UpdateScrapNoteController;
    };
    project: {
        createProject: CreateProjectController;
        deleteProject: DeleteProjectController;
        exportManuscript: ExportManuscriptController;
        loadProjectList: LoadProjectListController;
        openProject: OpenProjectController;
        reorderProjectItems: ReorderProjectItemsController;
    };
    sync: {
        getSyncState: GetSyncStateController;
    };
    world: {
        createCharacter: CreateCharacterController;
        createLocation: CreateLocationController;
        createOrganization: CreateOrganizationController;
        deleteCharacter: DeleteCharacterController;
        deleteLocation: DeleteLocationController;
        deleteOrganization: DeleteOrganizationController;
        overwriteCharacter: OverwriteCharacterController;
        overwriteLocation: OverwriteLocationController;
        overwriteOrganization: OverwriteOrganizationController;
    };
    timeline: {
        createTimeline: CreateTimelineController;
        updateTimeline: UpdateTimelineController;
        deleteTimeline: DeleteTimelineController;
        createEvent: CreateEventController;
        updateEvent: UpdateEventController;
        deleteEvent: DeleteEventController;
    };
}

export type ControllerContractMap = {
    [Category in keyof ControllerInstanceMap]: {
        [Action in keyof ControllerInstanceMap[Category]]: Handler<
            ControllerInstanceMap[Category][Action]
        >;
    };
};

export type RendererApi = ControllerContractMap;

export type ControllerChannelMap = {
    [Category in keyof ControllerInstanceMap]: {
        [Action in keyof ControllerInstanceMap[Category]]: string;
    };
};

export const controllerChannels: ControllerChannelMap = {
    analysis: {
        analyzeText: "analysis:analyzeText",
        editChapters: "analysis:editChapters",
        generalChat: "analysis:generalChat",
        loadChatHistory: "analysis:loadChatHistory",
        loadChatMessages: "analysis:loadChatMessages",
    },
    asset: {
        deleteAsset: "asset:deleteAsset",
        importAsset: "asset:importAsset",
    },
    auth: {
        loginUser: "auth:loginUser",
        logoutUser: "auth:logoutUser",
        registerUser: "auth:registerUser",
        getState: "auth:getState",
        updateEmail: "auth:updateEmail",
        updatePassword: "auth:updatePassword",
    },
    generation: {
        generateCharacterImage: "generation:generateCharacterImage",
        generateCharacterPlaylist: "generation:generateCharacterPlaylist",
        generateCharacterSong: "generation:generateCharacterSong",
        generateLocationImage: "generation:generateLocationImage",
        generateLocationPlaylist: "generation:generateLocationPlaylist",
        generateLocationSong: "generation:generateLocationSong",
        generateOrganizationImage: "generation:generateOrganizationImage",
        generateOrganizationPlaylist: "generation:generateOrganizationPlaylist",
        generateOrganizationSong: "generation:generateOrganizationSong",
    },
    logistics: {
        saveChapterContent: "logistics:saveChapterContent",
        saveCharacterInfo: "logistics:saveCharacterInfo",
        saveLocationInfo: "logistics:saveLocationInfo",
        saveManuscriptStructure: "logistics:saveManuscriptStructure",
        saveOrganizationInfo: "logistics:saveOrganizationInfo",
        saveProjectSettings: "logistics:saveProjectSettings",
        saveUserSettings: "logistics:saveUserSettings",
    },
    manuscript: {
        createChapter: "manuscript:createChapter",
        createScrapNote: "manuscript:createScrapNote",
        deleteChapter: "manuscript:deleteChapter",
        deleteScrapNote: "manuscript:deleteScrapNote",
        moveChapter: "manuscript:moveChapter",
        overwriteChapter: "manuscript:overwriteChapter",
        overwriteScrapNote: "manuscript:overwriteScrapNote",
        renameChapter: "manuscript:renameChapter",
        updateScrapNote: "manuscript:updateScrapNote",
    },
    project: {
        createProject: "project:createProject",
        deleteProject: "project:deleteProject",
        exportManuscript: "project:exportManuscript",
        loadProjectList: "project:loadProjectList",
        openProject: "project:openProject",
        reorderProjectItems: "project:reorderProjectItems",
    },
    sync: {
        getSyncState: "sync:getSyncState",
    },
    world: {
        createCharacter: "world:createCharacter",
        createLocation: "world:createLocation",
        createOrganization: "world:createOrganization",
        deleteCharacter: "world:deleteCharacter",
        deleteLocation: "world:deleteLocation",
        deleteOrganization: "world:deleteOrganization",
        overwriteCharacter: "world:overwriteCharacter",
        overwriteLocation: "world:overwriteLocation",
        overwriteOrganization: "world:overwriteOrganization",
    },
    timeline: {
        createTimeline: "timeline:createTimeline",
        updateTimeline: "timeline:updateTimeline",
        deleteTimeline: "timeline:deleteTimeline",
        createEvent: "timeline:createEvent",
        updateEvent: "timeline:updateEvent",
        deleteEvent: "timeline:deleteEvent",
    },
} as const;
