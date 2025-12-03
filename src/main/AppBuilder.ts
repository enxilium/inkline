import { ipcMain, IpcMainInvokeEvent } from "electron";
import {
    controllerChannels,
    type ControllerInstanceMap,
} from "../@interface-adapters/controllers/contracts";
import {
    Controller,
    IpcController,
} from "../@interface-adapters/controllers/Controller";
import { AnalyzeText } from "../@core/application/use-cases/analysis/AnalyzeText";
import { EditChapters } from "../@core/application/use-cases/analysis/EditChapters";
import { GeneralChat } from "../@core/application/use-cases/analysis/GeneralChat";
import { DeleteAsset } from "../@core/application/use-cases/asset/DeleteAsset";
import { ImportAsset } from "../@core/application/use-cases/asset/ImportAsset";
import { LoginUser } from "../@core/application/use-cases/auth/LoginUser";
import { LogoutUser } from "../@core/application/use-cases/auth/LogoutUser";
import { RegisterUser } from "../@core/application/use-cases/auth/RegisterUser";
import { LoadStoredSession } from "../@core/application/use-cases/auth/LoadStoredSession";
import { GenerateCharacterImage } from "../@core/application/use-cases/generation/GenerateCharacterImage";
import { GenerateCharacterPlaylist } from "../@core/application/use-cases/generation/GenerateCharacterPlaylist";
import { GenerateCharacterSong } from "../@core/application/use-cases/generation/GenerateCharacterSong";
import { GenerateLocationImage } from "../@core/application/use-cases/generation/GenerateLocationImage";
import { GenerateLocationPlaylist } from "../@core/application/use-cases/generation/GenerateLocationPlaylist";
import { GenerateLocationSong } from "../@core/application/use-cases/generation/GenerateLocationSong";
import { GenerateOrganizationImage } from "../@core/application/use-cases/generation/GenerateOrganizationImage";
import { GenerateOrganizationPlaylist } from "../@core/application/use-cases/generation/GenerateOrganizationPlaylist";
import { GenerateOrganizationSong } from "../@core/application/use-cases/generation/GenerateOrganizationSong";
import { SaveChapterContent } from "../@core/application/use-cases/logistics/SaveChapterContent";
import { SaveCharacterInfo } from "../@core/application/use-cases/logistics/SaveCharacterInfo";
import { SaveLocationInfo } from "../@core/application/use-cases/logistics/SaveLocationInfo";
import { SaveManuscriptStructure } from "../@core/application/use-cases/logistics/SaveManuscriptStructure";
import { SaveOrganizationInfo } from "../@core/application/use-cases/logistics/SaveOrganizationInfo";
import { SaveProjectSettings } from "../@core/application/use-cases/logistics/SaveProjectSettings";
import { SaveUserSettings } from "../@core/application/use-cases/logistics/SaveUserSettings";
import { CreateChapter } from "../@core/application/use-cases/manuscript/CreateChapter";
import { CreateScrapNote } from "../@core/application/use-cases/manuscript/CreateScrapNote";
import { DeleteChapter } from "../@core/application/use-cases/manuscript/DeleteChapter";
import { DeleteScrapNote } from "../@core/application/use-cases/manuscript/DeleteScrapNote";
import { GlobalFind } from "../@core/application/use-cases/manuscript/GlobalFind";
import { GlobalFindAndReplace } from "../@core/application/use-cases/manuscript/GlobalFindAndReplace";
import { MoveChapter } from "../@core/application/use-cases/manuscript/MoveChapter";
import { RenameChapter } from "../@core/application/use-cases/manuscript/RenameChapter";
import { UpdateScrapNote } from "../@core/application/use-cases/manuscript/UpdateScrapNote";
import { CreateProject } from "../@core/application/use-cases/project/CreateProject";
import { DeleteProject } from "../@core/application/use-cases/project/DeleteProject";
import { ExportManuscript } from "../@core/application/use-cases/project/ExportManuscript";
import { LoadProjectList } from "../@core/application/use-cases/project/LoadProjectList";
import { OpenProject } from "../@core/application/use-cases/project/OpenProject";
import { ReorderProjectItems } from "../@core/application/use-cases/project/ReorderProjectItems";
import { CreateCharacter } from "../@core/application/use-cases/world/CreateCharacter";
import { CreateLocation } from "../@core/application/use-cases/world/CreateLocation";
import { CreateOrganization } from "../@core/application/use-cases/world/CreateOrganization";
import { DeleteCharacter } from "../@core/application/use-cases/world/DeleteCharacter";
import { DeleteLocation } from "../@core/application/use-cases/world/DeleteLocation";
import { DeleteOrganization } from "../@core/application/use-cases/world/DeleteOrganization";
import { AnalyzeTextController } from "../@interface-adapters/controllers/analysis/AnalyzeTextController";
import { EditChaptersController } from "../@interface-adapters/controllers/analysis/EditChaptersController";
import { GeneralChatController } from "../@interface-adapters/controllers/analysis/GeneralChatController";
import { DeleteAssetController } from "../@interface-adapters/controllers/asset/DeleteAssetController";
import { ImportAssetController } from "../@interface-adapters/controllers/asset/ImportAssetController";
import { LoginUserController } from "../@interface-adapters/controllers/auth/LoginUserController";
import { LogoutUserController } from "../@interface-adapters/controllers/auth/LogoutUserController";
import { RegisterUserController } from "../@interface-adapters/controllers/auth/RegisterUserController";
import { GetAuthStateController } from "../@interface-adapters/controllers/auth/GetAuthStateController";
import { GenerateCharacterImageController } from "../@interface-adapters/controllers/generation/GenerateCharacterImageController";
import { GenerateCharacterPlaylistController } from "../@interface-adapters/controllers/generation/GenerateCharacterPlaylistController";
import { GenerateCharacterSongController } from "../@interface-adapters/controllers/generation/GenerateCharacterSongController";
import { GenerateLocationImageController } from "../@interface-adapters/controllers/generation/GenerateLocationImageController";
import { GenerateLocationPlaylistController } from "../@interface-adapters/controllers/generation/GenerateLocationPlaylistController";
import { GenerateLocationSongController } from "../@interface-adapters/controllers/generation/GenerateLocationSongController";
import { GenerateOrganizationImageController } from "../@interface-adapters/controllers/generation/GenerateOrganizationImageController";
import { GenerateOrganizationPlaylistController } from "../@interface-adapters/controllers/generation/GenerateOrganizationPlaylistController";
import { GenerateOrganizationSongController } from "../@interface-adapters/controllers/generation/GenerateOrganizationSongController";
import { SaveChapterContentController } from "../@interface-adapters/controllers/logistics/SaveChapterContentController";
import { SaveCharacterInfoController } from "../@interface-adapters/controllers/logistics/SaveCharacterInfoController";
import { SaveLocationInfoController } from "../@interface-adapters/controllers/logistics/SaveLocationInfoController";
import { SaveManuscriptStructureController } from "../@interface-adapters/controllers/logistics/SaveManuscriptStructureController";
import { SaveOrganizationInfoController } from "../@interface-adapters/controllers/logistics/SaveOrganizationInfoController";
import { SaveProjectSettingsController } from "../@interface-adapters/controllers/logistics/SaveProjectSettingsController";
import { SaveUserSettingsController } from "../@interface-adapters/controllers/logistics/SaveUserSettingsController";
import { CreateChapterController } from "../@interface-adapters/controllers/manuscript/CreateChapterController";
import { CreateScrapNoteController } from "../@interface-adapters/controllers/manuscript/CreateScrapNoteController";
import { DeleteChapterController } from "../@interface-adapters/controllers/manuscript/DeleteChapterController";
import { DeleteScrapNoteController } from "../@interface-adapters/controllers/manuscript/DeleteScrapNoteController";
import { GlobalFindController } from "../@interface-adapters/controllers/manuscript/GlobalFindController";
import { GlobalFindAndReplaceController } from "../@interface-adapters/controllers/manuscript/GlobalFindAndReplaceController";
import { MoveChapterController } from "../@interface-adapters/controllers/manuscript/MoveChapterController";
import { RenameChapterController } from "../@interface-adapters/controllers/manuscript/RenameChapterController";
import { UpdateScrapNoteController } from "../@interface-adapters/controllers/manuscript/UpdateScrapNoteController";
import { CreateProjectController } from "../@interface-adapters/controllers/project/CreateProjectController";
import { DeleteProjectController } from "../@interface-adapters/controllers/project/DeleteProjectController";
import { ExportManuscriptController } from "../@interface-adapters/controllers/project/ExportManuscriptController";
import { LoadProjectListController } from "../@interface-adapters/controllers/project/LoadProjectListController";
import { OpenProjectController } from "../@interface-adapters/controllers/project/OpenProjectController";
import { ReorderProjectItemsController } from "../@interface-adapters/controllers/project/ReorderProjectItemsController";
import { CreateCharacterController } from "../@interface-adapters/controllers/world/CreateCharacterController";
import { CreateLocationController } from "../@interface-adapters/controllers/world/CreateLocationController";
import { CreateOrganizationController } from "../@interface-adapters/controllers/world/CreateOrganizationController";
import { DeleteCharacterController } from "../@interface-adapters/controllers/world/DeleteCharacterController";
import { DeleteLocationController } from "../@interface-adapters/controllers/world/DeleteLocationController";
import { DeleteOrganizationController } from "../@interface-adapters/controllers/world/DeleteOrganizationController";
import type { IAssetRepository } from "../@core/domain/repositories/IAssetRepository";
import type { IChapterRepository } from "../@core/domain/repositories/IChapterRepository";
import type { ICharacterRepository } from "../@core/domain/repositories/ICharacterRepository";
import type { IChatConversationRepository } from "../@core/domain/repositories/IChatConversationRepository";
import type { ILocationRepository } from "../@core/domain/repositories/ILocationRepository";
import type { IOrganizationRepository } from "../@core/domain/repositories/IOrganizationRepository";
import type { IProjectRepository } from "../@core/domain/repositories/IProjectRepository";
import type { IScrapNoteRepository } from "../@core/domain/repositories/IScrapNoteRepository";
import type { IUserRepository } from "../@core/domain/repositories/IUserRepository";
import type { IAITextService } from "../@core/domain/services/IAITextService";
import type { IAudioGenerationService } from "../@core/domain/services/IAudioGenerationService";
import type { IAuthService } from "../@core/domain/services/IAuthService";
import type { IExportService } from "../@core/domain/services/IExportService";
import type { IImageGenerationService } from "../@core/domain/services/IImageGenerationService";
import type { IPlaylistGenerationService } from "../@core/domain/services/IPlaylistGenerationService";
import type { IStorageService } from "../@core/domain/services/IStorageService";
import type { IUserSessionStore } from "../@core/domain/services/IUserSessionStore";
import { ElectronAuthStateGateway } from "./auth/ElectronAuthStateGateway";

export type RepositoryDependencies = {
    asset: IAssetRepository;
    chapter: IChapterRepository;
    character: ICharacterRepository;
    chatConversation: IChatConversationRepository;
    location: ILocationRepository;
    organization: IOrganizationRepository;
    project: IProjectRepository;
    scrapNote: IScrapNoteRepository;
    user: IUserRepository;
};

export type ServiceDependencies = {
    aiText: IAITextService;
    audioGeneration: IAudioGenerationService;
    auth: IAuthService;
    export: IExportService;
    imageGeneration: IImageGenerationService;
    playlistGeneration: IPlaylistGenerationService;
    storage: IStorageService;
    sessionStore: IUserSessionStore;
};

export interface AppBuilderDependencies {
    repositories: RepositoryDependencies;
    services: ServiceDependencies;
}

type UseCaseMap = {
    analysis: {
        analyzeText: AnalyzeText;
        editChapters: EditChapters;
        generalChat: GeneralChat;
    };
    asset: {
        deleteAsset: DeleteAsset;
        importAsset: ImportAsset;
    };
    auth: {
        loginUser: LoginUser;
        logoutUser: LogoutUser;
        registerUser: RegisterUser;
        loadStoredSession: LoadStoredSession;
    };
    generation: {
        generateCharacterImage: GenerateCharacterImage;
        generateCharacterPlaylist: GenerateCharacterPlaylist;
        generateCharacterSong: GenerateCharacterSong;
        generateLocationImage: GenerateLocationImage;
        generateLocationPlaylist: GenerateLocationPlaylist;
        generateLocationSong: GenerateLocationSong;
        generateOrganizationImage: GenerateOrganizationImage;
        generateOrganizationPlaylist: GenerateOrganizationPlaylist;
        generateOrganizationSong: GenerateOrganizationSong;
    };
    logistics: {
        saveChapterContent: SaveChapterContent;
        saveCharacterInfo: SaveCharacterInfo;
        saveLocationInfo: SaveLocationInfo;
        saveManuscriptStructure: SaveManuscriptStructure;
        saveOrganizationInfo: SaveOrganizationInfo;
        saveProjectSettings: SaveProjectSettings;
        saveUserSettings: SaveUserSettings;
    };
    manuscript: {
        createChapter: CreateChapter;
        createScrapNote: CreateScrapNote;
        deleteChapter: DeleteChapter;
        deleteScrapNote: DeleteScrapNote;
        globalFind: GlobalFind;
        globalFindAndReplace: GlobalFindAndReplace;
        moveChapter: MoveChapter;
        renameChapter: RenameChapter;
        updateScrapNote: UpdateScrapNote;
    };
    project: {
        createProject: CreateProject;
        deleteProject: DeleteProject;
        exportManuscript: ExportManuscript;
        loadProjectList: LoadProjectList;
        openProject: OpenProject;
        reorderProjectItems: ReorderProjectItems;
    };
    world: {
        createCharacter: CreateCharacter;
        createLocation: CreateLocation;
        createOrganization: CreateOrganization;
        deleteCharacter: DeleteCharacter;
        deleteLocation: DeleteLocation;
        deleteOrganization: DeleteOrganization;
    };
};

const invokeController = <
    TController extends { handle: (...args: unknown[]) => unknown },
>(
    controller: TController,
    event: IpcMainInvokeEvent,
    args: unknown[]
): ReturnType<TController["handle"]> => {
    if ("handleWithEvent" in controller) {
        return (controller as any).handleWithEvent(
            event,
            ...(args as Parameters<TController["handle"]>)
        ) as ReturnType<TController["handle"]>;
    }
    return controller.handle(
        ...(args as Parameters<TController["handle"]>)
    ) as ReturnType<TController["handle"]>;
};

export class AppBuilder {
    private controllers: ControllerInstanceMap | null = null;
    private readonly authStateGateway = new ElectronAuthStateGateway();

    constructor(private readonly dependencies: AppBuilderDependencies) {}

    async build(): Promise<void> {
        const useCases = this.createUseCases();
        this.controllers = this.createControllers(useCases);
        this.registerIpcHandlers();
        await this.initializeAuthState(useCases.auth.loadStoredSession);
    }

    private createUseCases(): UseCaseMap {
        const { repositories: repo, services: svc } = this.dependencies;

        return {
            analysis: {
                analyzeText: new AnalyzeText(
                    svc.aiText,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.organization,
                    repo.project
                ),
                editChapters: new EditChapters(
                    svc.aiText,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.organization,
                    repo.project
                ),
                generalChat: new GeneralChat(
                    svc.aiText,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.organization,
                    repo.chatConversation,
                    repo.project
                ),
            },
            asset: {
                deleteAsset: new DeleteAsset(
                    repo.asset,
                    svc.storage,
                    repo.character,
                    repo.location,
                    repo.organization
                ),
                importAsset: new ImportAsset(
                    repo.asset,
                    svc.storage,
                    repo.character,
                    repo.location,
                    repo.organization,
                    repo.chapter,
                    repo.project
                ),
            },
            auth: {
                loginUser: new LoginUser(svc.auth, repo.user, svc.sessionStore),
                logoutUser: new LogoutUser(svc.auth, svc.sessionStore),
                registerUser: new RegisterUser(
                    svc.auth,
                    repo.user,
                    svc.sessionStore
                ),
                loadStoredSession: new LoadStoredSession(
                    svc.sessionStore,
                    svc.auth
                ),
            },
            generation: {
                generateCharacterImage: new GenerateCharacterImage(
                    repo.character,
                    repo.asset,
                    svc.imageGeneration,
                    svc.storage
                ),
                generateCharacterPlaylist: new GenerateCharacterPlaylist(
                    repo.character,
                    svc.playlistGeneration,
                    repo.asset,
                    svc.storage
                ),
                generateCharacterSong: new GenerateCharacterSong(
                    repo.character,
                    svc.audioGeneration,
                    svc.storage,
                    repo.asset
                ),
                generateLocationImage: new GenerateLocationImage(
                    repo.location,
                    repo.asset,
                    svc.imageGeneration,
                    svc.storage
                ),
                generateLocationPlaylist: new GenerateLocationPlaylist(
                    repo.location,
                    svc.playlistGeneration,
                    repo.asset,
                    svc.storage
                ),
                generateLocationSong: new GenerateLocationSong(
                    repo.location,
                    svc.audioGeneration,
                    svc.storage,
                    repo.asset
                ),
                generateOrganizationImage: new GenerateOrganizationImage(
                    repo.organization,
                    repo.asset,
                    svc.imageGeneration,
                    svc.storage
                ),
                generateOrganizationPlaylist: new GenerateOrganizationPlaylist(
                    repo.organization,
                    svc.playlistGeneration,
                    repo.asset,
                    svc.storage
                ),
                generateOrganizationSong: new GenerateOrganizationSong(
                    repo.organization,
                    svc.audioGeneration,
                    svc.storage,
                    repo.asset
                ),
            },
            logistics: {
                saveChapterContent: new SaveChapterContent(repo.chapter),
                saveCharacterInfo: new SaveCharacterInfo(
                    repo.character,
                    repo.location,
                    repo.organization
                ),
                saveLocationInfo: new SaveLocationInfo(repo.location),
                saveManuscriptStructure: new SaveManuscriptStructure(
                    repo.project,
                    repo.chapter
                ),
                saveOrganizationInfo: new SaveOrganizationInfo(
                    repo.organization,
                    repo.location
                ),
                saveProjectSettings: new SaveProjectSettings(repo.project),
                saveUserSettings: new SaveUserSettings(repo.user),
            },
            manuscript: {
                createChapter: new CreateChapter(repo.chapter, repo.project),
                createScrapNote: new CreateScrapNote(
                    repo.scrapNote,
                    repo.project
                ),
                deleteChapter: new DeleteChapter(repo.chapter, repo.project),
                deleteScrapNote: new DeleteScrapNote(
                    repo.scrapNote,
                    repo.project
                ),
                globalFind: new GlobalFind(repo.chapter),
                globalFindAndReplace: new GlobalFindAndReplace(repo.chapter),
                moveChapter: new MoveChapter(repo.project, repo.chapter),
                renameChapter: new RenameChapter(repo.chapter),
                updateScrapNote: new UpdateScrapNote(repo.scrapNote),
            },
            project: {
                createProject: new CreateProject(repo.project, repo.user),
                deleteProject: new DeleteProject(
                    repo.project,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.scrapNote,
                    repo.organization,
                    repo.asset,
                    svc.storage,
                    repo.chatConversation,
                    repo.user
                ),
                exportManuscript: new ExportManuscript(svc.export),
                loadProjectList: new LoadProjectList(repo.project, repo.asset),
                openProject: new OpenProject(
                    repo.project,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.scrapNote,
                    repo.organization,
                    repo.asset
                ),
                reorderProjectItems: new ReorderProjectItems(repo.project),
            },
            world: {
                createCharacter: new CreateCharacter(
                    repo.character,
                    repo.project
                ),
                createLocation: new CreateLocation(repo.location, repo.project),
                createOrganization: new CreateOrganization(
                    repo.organization,
                    repo.project
                ),
                deleteCharacter: new DeleteCharacter(
                    repo.character,
                    repo.location,
                    repo.project,
                    repo.asset,
                    svc.storage
                ),
                deleteLocation: new DeleteLocation(
                    repo.location,
                    repo.project,
                    repo.character,
                    repo.organization,
                    repo.asset,
                    svc.storage
                ),
                deleteOrganization: new DeleteOrganization(
                    repo.organization,
                    repo.project,
                    repo.character,
                    repo.location,
                    repo.asset,
                    svc.storage
                ),
            },
        };
    }

    private createControllers(useCases: UseCaseMap): ControllerInstanceMap {
        return {
            analysis: {
                analyzeText: new AnalyzeTextController(
                    useCases.analysis.analyzeText
                ),
                editChapters: new EditChaptersController(
                    useCases.analysis.editChapters
                ),
                generalChat: new GeneralChatController(
                    useCases.analysis.generalChat
                ),
            },
            asset: {
                deleteAsset: new DeleteAssetController(
                    useCases.asset.deleteAsset
                ),
                importAsset: new ImportAssetController(
                    useCases.asset.importAsset
                ),
            },
            auth: {
                loginUser: new LoginUserController(
                    useCases.auth.loginUser,
                    this.authStateGateway
                ),
                logoutUser: new LogoutUserController(
                    useCases.auth.logoutUser,
                    this.authStateGateway
                ),
                registerUser: new RegisterUserController(
                    useCases.auth.registerUser,
                    this.authStateGateway
                ),
                getState: new GetAuthStateController(this.authStateGateway),
            },
            generation: {
                generateCharacterImage: new GenerateCharacterImageController(
                    useCases.generation.generateCharacterImage
                ),
                generateCharacterPlaylist:
                    new GenerateCharacterPlaylistController(
                        useCases.generation.generateCharacterPlaylist
                    ),
                generateCharacterSong: new GenerateCharacterSongController(
                    useCases.generation.generateCharacterSong
                ),
                generateLocationImage: new GenerateLocationImageController(
                    useCases.generation.generateLocationImage
                ),
                generateLocationPlaylist:
                    new GenerateLocationPlaylistController(
                        useCases.generation.generateLocationPlaylist
                    ),
                generateLocationSong: new GenerateLocationSongController(
                    useCases.generation.generateLocationSong
                ),
                generateOrganizationImage:
                    new GenerateOrganizationImageController(
                        useCases.generation.generateOrganizationImage
                    ),
                generateOrganizationPlaylist:
                    new GenerateOrganizationPlaylistController(
                        useCases.generation.generateOrganizationPlaylist
                    ),
                generateOrganizationSong:
                    new GenerateOrganizationSongController(
                        useCases.generation.generateOrganizationSong
                    ),
            },
            logistics: {
                saveChapterContent: new SaveChapterContentController(
                    useCases.logistics.saveChapterContent
                ),
                saveCharacterInfo: new SaveCharacterInfoController(
                    useCases.logistics.saveCharacterInfo
                ),
                saveLocationInfo: new SaveLocationInfoController(
                    useCases.logistics.saveLocationInfo
                ),
                saveManuscriptStructure: new SaveManuscriptStructureController(
                    useCases.logistics.saveManuscriptStructure
                ),
                saveOrganizationInfo: new SaveOrganizationInfoController(
                    useCases.logistics.saveOrganizationInfo
                ),
                saveProjectSettings: new SaveProjectSettingsController(
                    useCases.logistics.saveProjectSettings
                ),
                saveUserSettings: new SaveUserSettingsController(
                    useCases.logistics.saveUserSettings
                ),
            },
            manuscript: {
                createChapter: new CreateChapterController(
                    useCases.manuscript.createChapter
                ),
                createScrapNote: new CreateScrapNoteController(
                    useCases.manuscript.createScrapNote
                ),
                deleteChapter: new DeleteChapterController(
                    useCases.manuscript.deleteChapter
                ),
                deleteScrapNote: new DeleteScrapNoteController(
                    useCases.manuscript.deleteScrapNote
                ),
                globalFind: new GlobalFindController(
                    useCases.manuscript.globalFind
                ),
                globalFindAndReplace: new GlobalFindAndReplaceController(
                    useCases.manuscript.globalFindAndReplace
                ),
                moveChapter: new MoveChapterController(
                    useCases.manuscript.moveChapter
                ),
                renameChapter: new RenameChapterController(
                    useCases.manuscript.renameChapter
                ),
                updateScrapNote: new UpdateScrapNoteController(
                    useCases.manuscript.updateScrapNote
                ),
            },
            project: {
                createProject: new CreateProjectController(
                    useCases.project.createProject
                ),
                deleteProject: new DeleteProjectController(
                    useCases.project.deleteProject
                ),
                exportManuscript: new ExportManuscriptController(
                    useCases.project.exportManuscript
                ),
                loadProjectList: new LoadProjectListController(
                    useCases.project.loadProjectList
                ),
                openProject: new OpenProjectController(
                    useCases.project.openProject
                ),
                reorderProjectItems: new ReorderProjectItemsController(
                    useCases.project.reorderProjectItems
                ),
            },
            world: {
                createCharacter: new CreateCharacterController(
                    useCases.world.createCharacter
                ),
                createLocation: new CreateLocationController(
                    useCases.world.createLocation
                ),
                createOrganization: new CreateOrganizationController(
                    useCases.world.createOrganization
                ),
                deleteCharacter: new DeleteCharacterController(
                    useCases.world.deleteCharacter
                ),
                deleteLocation: new DeleteLocationController(
                    useCases.world.deleteLocation
                ),
                deleteOrganization: new DeleteOrganizationController(
                    useCases.world.deleteOrganization
                ),
            },
        };
    }

    private async initializeAuthState(
        loadStoredSession: LoadStoredSession
    ): Promise<void> {
        try {
            const { user } = await loadStoredSession.execute();
            this.authStateGateway.setUser(user);
        } catch (error) {
            console.error("Failed to initialize auth state", error);
        }
    }

    private registerIpcHandlers(): void {
        if (!this.controllers) {
            throw new Error("Controllers have not been initialized.");
        }

        const categories = Object.keys(controllerChannels) as Array<
            keyof ControllerInstanceMap
        >;

        for (const category of categories) {
            const actions = Object.keys(controllerChannels[category]) as Array<
                keyof ControllerInstanceMap[typeof category]
            >;

            for (const action of actions) {
                const channel = controllerChannels[category][action];
                const controller = this.controllers[category][action];

                ipcMain.handle(channel, (event, ...args) =>
                    invokeController(controller, event, args)
                );
            }
        }
    }
}
