import type { AnalyzeTextController } from "./analysis/AnalyzeTextController";
import type { EditChaptersController } from "./analysis/EditChaptersController";
import type { GeneralChatController } from "./analysis/GeneralChatController";
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
import type { GlobalFindController } from "./manuscript/GlobalFindController";
import type { GlobalFindAndReplaceController } from "./manuscript/GlobalFindAndReplaceController";
import type { MoveChapterController } from "./manuscript/MoveChapterController";
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
        globalFind: GlobalFindController;
        globalFindAndReplace: GlobalFindAndReplaceController;
        moveChapter: MoveChapterController;
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
    world: {
        createCharacter: CreateCharacterController;
        createLocation: CreateLocationController;
        createOrganization: CreateOrganizationController;
        deleteCharacter: DeleteCharacterController;
        deleteLocation: DeleteLocationController;
        deleteOrganization: DeleteOrganizationController;
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
        globalFind: "manuscript:globalFind",
        globalFindAndReplace: "manuscript:globalFindAndReplace",
        moveChapter: "manuscript:moveChapter",
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
    world: {
        createCharacter: "world:createCharacter",
        createLocation: "world:createLocation",
        createOrganization: "world:createOrganization",
        deleteCharacter: "world:deleteCharacter",
        deleteLocation: "world:deleteLocation",
        deleteOrganization: "world:deleteOrganization",
    },
} as const;
