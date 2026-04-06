import { ipcMain, IpcMainInvokeEvent } from "electron";
import {
    controllerChannels,
    type ControllerInstanceMap,
} from "../@interface-adapters/controllers/contracts";
import { IpcController } from "../@interface-adapters/controllers/Controller";
import { AnalyzeText } from "../@core/application/use-cases/analysis/AnalyzeText";
import { EditChapters } from "../@core/application/use-cases/analysis/EditChapters";
import { GeneralChat } from "../@core/application/use-cases/analysis/GeneralChat";
import { DeleteAsset } from "../@core/application/use-cases/asset/DeleteAsset";
import { ImportAsset } from "../@core/application/use-cases/asset/ImportAsset";
import { LoginUser } from "../@core/application/use-cases/auth/LoginUser";
import { LogoutUser } from "../@core/application/use-cases/auth/LogoutUser";
import { RegisterUser } from "../@core/application/use-cases/auth/RegisterUser";
import { LoadStoredSession } from "../@core/application/use-cases/auth/LoadStoredSession";
import { UpdateUserEmail } from "../@core/application/use-cases/auth/UpdateUserEmail";
import { UpdateUserPassword } from "../@core/application/use-cases/auth/UpdateUserPassword";
import { ResetPassword } from "../@core/application/use-cases/auth/ResetPassword";
import { DeleteAccount } from "../@core/application/use-cases/auth/DeleteAccount";
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
import { ReorderLocationChildren } from "../@core/application/use-cases/logistics/ReorderLocationChildren";
import { SaveOrganizationInfo } from "../@core/application/use-cases/logistics/SaveOrganizationInfo";
import { SaveProjectSettings } from "../@core/application/use-cases/logistics/SaveProjectSettings";
import { SaveUserSettings } from "../@core/application/use-cases/logistics/SaveUserSettings";
import { CreateChapter } from "../@core/application/use-cases/manuscript/CreateChapter";
import { CreateScrapNote } from "../@core/application/use-cases/manuscript/CreateScrapNote";
import { DeleteChapter } from "../@core/application/use-cases/manuscript/DeleteChapter";
import { DeleteScrapNote } from "../@core/application/use-cases/manuscript/DeleteScrapNote";
import { MoveChapter } from "../@core/application/use-cases/manuscript/MoveChapter";
import { OverwriteChapter } from "../@core/application/use-cases/manuscript/OverwriteChapter";
import { OverwriteScrapNote } from "../@core/application/use-cases/manuscript/OverwriteScrapNote";
import { RenameChapter } from "../@core/application/use-cases/manuscript/RenameChapter";
import { UpdateScrapNote } from "../@core/application/use-cases/manuscript/UpdateScrapNote";
import { CreateProject } from "../@core/application/use-cases/project/CreateProject";
import { DeleteProject } from "../@core/application/use-cases/project/DeleteProject";
import { ExportManuscript } from "../@core/application/use-cases/project/ExportManuscript";
import { LoadProjectList } from "../@core/application/use-cases/project/LoadProjectList";
import { OpenProject } from "../@core/application/use-cases/project/OpenProject";
import { RenameProject } from "../@core/application/use-cases/project/RenameProject";
import { ReorderProjectItems } from "../@core/application/use-cases/project/ReorderProjectItems";
import { ImportProject } from "../@core/application/use-cases/project/ImportProject";
import { CreateCharacter } from "../@core/application/use-cases/world/CreateCharacter";
import { CreateLocation } from "../@core/application/use-cases/world/CreateLocation";
import { CreateOrganization } from "../@core/application/use-cases/world/CreateOrganization";
import { DeleteCharacter } from "../@core/application/use-cases/world/DeleteCharacter";
import { DeleteLocation } from "../@core/application/use-cases/world/DeleteLocation";
import { DeleteOrganization } from "../@core/application/use-cases/world/DeleteOrganization";
import { OverwriteCharacter } from "../@core/application/use-cases/world/OverwriteCharacter";
import { OverwriteLocation } from "../@core/application/use-cases/world/OverwriteLocation";
import { OverwriteOrganization } from "../@core/application/use-cases/world/OverwriteOrganization";
import { CreateTimeline } from "../@core/application/use-cases/timeline/CreateTimeline";
import { UpdateTimeline } from "../@core/application/use-cases/timeline/UpdateTimeline";
import { DeleteTimeline } from "../@core/application/use-cases/timeline/DeleteTimeline";
import { CreateEvent } from "../@core/application/use-cases/timeline/CreateEvent";
import { UpdateEvent } from "../@core/application/use-cases/timeline/UpdateEvent";
import { DeleteEvent } from "../@core/application/use-cases/timeline/DeleteEvent";
import { LoadChatHistory } from "../@core/application/use-cases/analysis/LoadChatHistory";
import { LoadChatMessages } from "../@core/application/use-cases/analysis/LoadChatMessages";
import { ListProjectMetafields } from "../@core/application/use-cases/metafield/ListProjectMetafields";
import { CreateOrReuseMetafieldDefinition } from "../@core/application/use-cases/metafield/CreateOrReuseMetafieldDefinition";
import { AssignMetafieldToEntity } from "../@core/application/use-cases/metafield/AssignMetafieldToEntity";
import { SaveMetafieldValue } from "../@core/application/use-cases/metafield/SaveMetafieldValue";
import { SaveMetafieldSelectOptions } from "../@core/application/use-cases/metafield/SaveMetafieldSelectOptions";
import { SaveEditorTemplate } from "../@core/application/use-cases/metafield/SaveEditorTemplate";
import { RemoveMetafieldFromEntity } from "../@core/application/use-cases/metafield/RemoveMetafieldFromEntity";
import { DeleteMetafieldDefinitionGlobal } from "../@core/application/use-cases/metafield/DeleteMetafieldDefinitionGlobal";
import { SubmitBugReport } from "../@core/application/use-cases/support/SubmitBugReport";
import { LoadChatHistoryController } from "../@interface-adapters/controllers/analysis/LoadChatHistoryController";
import { LoadChatMessagesController } from "../@interface-adapters/controllers/analysis/LoadChatMessagesController";
import { AnalyzeTextController } from "../@interface-adapters/controllers/analysis/AnalyzeTextController";
import { EditChaptersController } from "../@interface-adapters/controllers/analysis/EditChaptersController";
import { GeneralChatController } from "../@interface-adapters/controllers/analysis/GeneralChatController";
import { DeleteAssetController } from "../@interface-adapters/controllers/asset/DeleteAssetController";
import { ImportAssetController } from "../@interface-adapters/controllers/asset/ImportAssetController";
import { LoginUserController } from "../@interface-adapters/controllers/auth/LoginUserController";
import { LogoutUserController } from "../@interface-adapters/controllers/auth/LogoutUserController";
import { RegisterUserController } from "../@interface-adapters/controllers/auth/RegisterUserController";
import { GetAuthStateController } from "../@interface-adapters/controllers/auth/GetAuthStateController";
import { ResolveGuestTransitionController } from "../@interface-adapters/controllers/auth/ResolveGuestTransitionController";
import { UpdateUserEmailController } from "../@interface-adapters/controllers/auth/UpdateUserEmailController";
import { UpdateUserPasswordController } from "../@interface-adapters/controllers/auth/UpdateUserPasswordController";
import { ResetPasswordController } from "../@interface-adapters/controllers/auth/ResetPasswordController";
import { DeleteAccountController } from "../@interface-adapters/controllers/auth/DeleteAccountController";
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
import { ReorderLocationChildrenController } from "../@interface-adapters/controllers/logistics/ReorderLocationChildrenController";
import { SaveOrganizationInfoController } from "../@interface-adapters/controllers/logistics/SaveOrganizationInfoController";
import { SaveProjectSettingsController } from "../@interface-adapters/controllers/logistics/SaveProjectSettingsController";
import { SaveUserSettingsController } from "../@interface-adapters/controllers/logistics/SaveUserSettingsController";
import { CreateChapterController } from "../@interface-adapters/controllers/manuscript/CreateChapterController";
import { CreateScrapNoteController } from "../@interface-adapters/controllers/manuscript/CreateScrapNoteController";
import { DeleteChapterController } from "../@interface-adapters/controllers/manuscript/DeleteChapterController";
import { DeleteScrapNoteController } from "../@interface-adapters/controllers/manuscript/DeleteScrapNoteController";
import { MoveChapterController } from "../@interface-adapters/controllers/manuscript/MoveChapterController";
import { OverwriteChapterController } from "../@interface-adapters/controllers/manuscript/OverwriteChapterController";
import { OverwriteScrapNoteController } from "../@interface-adapters/controllers/manuscript/OverwriteScrapNoteController";
import { RenameChapterController } from "../@interface-adapters/controllers/manuscript/RenameChapterController";
import { UpdateScrapNoteController } from "../@interface-adapters/controllers/manuscript/UpdateScrapNoteController";
import { GetSyncStateController } from "../@interface-adapters/controllers/sync/GetSyncStateController";
import { CreateProjectController } from "../@interface-adapters/controllers/project/CreateProjectController";
import { DeleteProjectController } from "../@interface-adapters/controllers/project/DeleteProjectController";
import { ExportManuscriptController } from "../@interface-adapters/controllers/project/ExportManuscriptController";
import { LoadProjectListController } from "../@interface-adapters/controllers/project/LoadProjectListController";
import { OpenProjectController } from "../@interface-adapters/controllers/project/OpenProjectController";
import { RenameProjectController } from "../@interface-adapters/controllers/project/RenameProjectController";
import { ReorderProjectItemsController } from "../@interface-adapters/controllers/project/ReorderProjectItemsController";
import { ImportProjectController } from "../@interface-adapters/controllers/project/ImportProjectController";
import { CreateCharacterController } from "../@interface-adapters/controllers/world/CreateCharacterController";
import { CreateLocationController } from "../@interface-adapters/controllers/world/CreateLocationController";
import { CreateOrganizationController } from "../@interface-adapters/controllers/world/CreateOrganizationController";
import { DeleteCharacterController } from "../@interface-adapters/controllers/world/DeleteCharacterController";
import { DeleteLocationController } from "../@interface-adapters/controllers/world/DeleteLocationController";
import { DeleteOrganizationController } from "../@interface-adapters/controllers/world/DeleteOrganizationController";
import { OverwriteCharacterController } from "../@interface-adapters/controllers/world/OverwriteCharacterController";
import { OverwriteLocationController } from "../@interface-adapters/controllers/world/OverwriteLocationController";
import { OverwriteOrganizationController } from "../@interface-adapters/controllers/world/OverwriteOrganizationController";
import { CreateTimelineController } from "../@interface-adapters/controllers/timeline/CreateTimelineController";
import { UpdateTimelineController } from "../@interface-adapters/controllers/timeline/UpdateTimelineController";
import { DeleteTimelineController } from "../@interface-adapters/controllers/timeline/DeleteTimelineController";
import { CreateEventController } from "../@interface-adapters/controllers/timeline/CreateEventController";
import { UpdateEventController } from "../@interface-adapters/controllers/timeline/UpdateEventController";
import { DeleteEventController } from "../@interface-adapters/controllers/timeline/DeleteEventController";
import { ListProjectMetafieldsController } from "../@interface-adapters/controllers/metafield/ListProjectMetafieldsController";
import { CreateOrReuseMetafieldDefinitionController } from "../@interface-adapters/controllers/metafield/CreateOrReuseMetafieldDefinitionController";
import { AssignMetafieldToEntityController } from "../@interface-adapters/controllers/metafield/AssignMetafieldToEntityController";
import { SaveMetafieldValueController } from "../@interface-adapters/controllers/metafield/SaveMetafieldValueController";
import { SaveMetafieldSelectOptionsController } from "../@interface-adapters/controllers/metafield/SaveMetafieldSelectOptionsController";
import { SaveEditorTemplateController } from "../@interface-adapters/controllers/metafield/SaveEditorTemplateController";
import { RemoveMetafieldFromEntityController } from "../@interface-adapters/controllers/metafield/RemoveMetafieldFromEntityController";
import { DeleteMetafieldDefinitionGlobalController } from "../@interface-adapters/controllers/metafield/DeleteMetafieldDefinitionGlobalController";
import { SubmitBugReportController } from "../@interface-adapters/controllers/support/SubmitBugReportController";
import type { IAssetRepository } from "../@core/domain/repositories/IAssetRepository";
import type { IChapterRepository } from "../@core/domain/repositories/IChapterRepository";
import type { ICharacterRepository } from "../@core/domain/repositories/ICharacterRepository";
import type { ITimelineRepository } from "../@core/domain/repositories/ITimelineRepository";
import type { IEventRepository } from "../@core/domain/repositories/IEventRepository";
import type { IChatConversationRepository } from "../@core/domain/repositories/IChatConversationRepository";
import type { ILocationRepository } from "../@core/domain/repositories/ILocationRepository";
import type { IOrganizationRepository } from "../@core/domain/repositories/IOrganizationRepository";
import type { IProjectRepository } from "../@core/domain/repositories/IProjectRepository";
import type { IScrapNoteRepository } from "../@core/domain/repositories/IScrapNoteRepository";
import type { IUserRepository } from "../@core/domain/repositories/IUserRepository";
import type { IMetafieldDefinitionRepository } from "../@core/domain/repositories/IMetafieldDefinitionRepository";
import type { IMetafieldAssignmentRepository } from "../@core/domain/repositories/IMetafieldAssignmentRepository";
import type { IEditorTemplateRepository } from "../@core/domain/repositories/IEditorTemplateRepository";
import type { IBugReportRepository } from "../@core/domain/repositories/IBugReportRepository";
import type { IAITextService } from "../@core/domain/services/IAITextService";
import type { ICreativeAssetGenerationService } from "../@core/domain/services/ICreativeAssetGenerationService";
import type { IAuthService } from "../@core/domain/services/IAuthService";
import type { IExportService } from "../@core/domain/services/IExportService";
import type { IEpubImportService } from "../@core/domain/services/IEpubImportService";
import type { IPlaylistGenerationService } from "../@core/domain/services/IPlaylistGenerationService";
import type { IStorageService } from "../@core/domain/services/IStorageService";
import type { IUserSessionStore } from "../@core/domain/services/IUserSessionStore";
import type { IGuestSessionTransitionService } from "../@core/domain/services/IGuestSessionTransitionService";
import { ElectronAuthStateGateway } from "./auth/ElectronAuthStateGateway";
import { ElectronSyncStateGateway } from "../@interface-adapters/controllers/sync/SyncStateGateway";
import { setupService } from "../@infrastructure/services/SetupService";
import type { EntityType as SyncEntityType } from "../@interface-adapters/controllers/sync/SyncStateGateway";

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
    timeline: ITimelineRepository;
    event: IEventRepository;
    metafieldDefinition: IMetafieldDefinitionRepository;
    metafieldAssignment: IMetafieldAssignmentRepository;
    editorTemplate: IEditorTemplateRepository;
    bugReport: IBugReportRepository;
};

export type ServiceDependencies = {
    aiText: IAITextService;
    audioGeneration: ICreativeAssetGenerationService;
    auth: IAuthService;
    export: IExportService;
    epubImport: IEpubImportService;
    imageGeneration: ICreativeAssetGenerationService;
    playlistGeneration: IPlaylistGenerationService;
    storage: IStorageService;
    sessionStore: IUserSessionStore;
    guestTransition: IGuestSessionTransitionService;
};

import { SynchronizationService } from "../@infrastructure/services/SynchronizationService";
import { deletionLog } from "../@infrastructure/db/offline/DeletionLog";
import { pendingUpdates } from "../@infrastructure/db/offline/PendingUpdates";
import { pendingRemoteDeletionLogs } from "../@infrastructure/db/offline/PendingRemoteDeletionLogs";

export interface AppBuilderDependencies {
    repositories: RepositoryDependencies;
    services: ServiceDependencies;
    syncService: SynchronizationService;
}

type UseCaseMap = {
    analysis: {
        analyzeText: AnalyzeText;
        editChapters: EditChapters;
        generalChat: GeneralChat;
        loadChatHistory: LoadChatHistory;
        loadChatMessages: LoadChatMessages;
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
        updateEmail: UpdateUserEmail;
        updatePassword: UpdateUserPassword;
        resetPassword: ResetPassword;
        deleteAccount: DeleteAccount;
    };
    metafield: {
        listProjectMetafields: ListProjectMetafields;
        createOrReuseMetafieldDefinition: CreateOrReuseMetafieldDefinition;
        assignMetafieldToEntity: AssignMetafieldToEntity;
        saveMetafieldValue: SaveMetafieldValue;
        saveMetafieldSelectOptions: SaveMetafieldSelectOptions;
        saveEditorTemplate: SaveEditorTemplate;
        removeMetafieldFromEntity: RemoveMetafieldFromEntity;
        deleteMetafieldDefinitionGlobal: DeleteMetafieldDefinitionGlobal;
    };
    support: {
        submitBugReport: SubmitBugReport;
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
        reorderLocationChildren: ReorderLocationChildren;
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
        moveChapter: MoveChapter;
        overwriteChapter: OverwriteChapter;
        overwriteScrapNote: OverwriteScrapNote;
        renameChapter: RenameChapter;
        updateScrapNote: UpdateScrapNote;
    };
    project: {
        createProject: CreateProject;
        deleteProject: DeleteProject;
        exportManuscript: ExportManuscript;
        importProject: ImportProject;
        loadProjectList: LoadProjectList;
        openProject: OpenProject;
        renameProject: RenameProject;
        reorderProjectItems: ReorderProjectItems;
    };
    world: {
        createCharacter: CreateCharacter;
        createLocation: CreateLocation;
        createOrganization: CreateOrganization;
        deleteCharacter: DeleteCharacter;
        deleteLocation: DeleteLocation;
        deleteOrganization: DeleteOrganization;
        overwriteCharacter: OverwriteCharacter;
        overwriteLocation: OverwriteLocation;
        overwriteOrganization: OverwriteOrganization;
    };
    timeline: {
        createTimeline: CreateTimeline;
        updateTimeline: UpdateTimeline;
        deleteTimeline: DeleteTimeline;
        createEvent: CreateEvent;
        updateEvent: UpdateEvent;
        deleteEvent: DeleteEvent;
    };
};

const invokeController = <
    TController extends { handle: (...args: unknown[]) => unknown },
>(
    controller: TController,
    event: IpcMainInvokeEvent,
    args: unknown[],
): ReturnType<TController["handle"]> => {
    if ("handleWithEvent" in controller) {
        return (
            controller as IpcController<unknown[], unknown>
        ).handleWithEvent(
            event,
            ...(args as Parameters<TController["handle"]>),
        ) as ReturnType<TController["handle"]>;
    }
    return controller.handle(
        ...(args as Parameters<TController["handle"]>),
    ) as ReturnType<TController["handle"]>;
};

export class AppBuilder {
    private controllers: ControllerInstanceMap | null = null;
    private readonly authStateGateway = new ElectronAuthStateGateway();
    private readonly syncStateGateway = new ElectronSyncStateGateway();

    constructor(private readonly dependencies: AppBuilderDependencies) {}

    async build(): Promise<void> {
        const useCases = this.createUseCases();
        this.controllers = this.createControllers(useCases);
        this.registerIpcHandlers();

        // Wire up sync state gateway to the synchronization service
        this.dependencies.syncService.setSyncStateGateway(
            this.syncStateGateway,
        );

        this.authStateGateway.on("auth-changed", (snapshot) => {
            if (snapshot.isAuthenticated && !snapshot.migrationInProgress) {
                this.dependencies.syncService.startAutoSync(
                    snapshot.currentUserId,
                );
            } else {
                this.dependencies.syncService.stopAutoSync("switch-user");
            }

            // Keep offline sync queues scoped even in guest mode.
            deletionLog.setActiveUserId(snapshot.currentUserId);
            pendingUpdates.setActiveUserId(snapshot.currentUserId);
            pendingRemoteDeletionLogs.setActiveUserId(snapshot.currentUserId);
        });

        // Register conflict resolution IPC handler
        ipcMain.handle(
            "sync:resolveConflict",
            async (
                _event,
                entityType: SyncEntityType,
                entityId: string,
                projectId: string,
                resolution: "accept-remote" | "keep-local",
            ) => {
                await this.dependencies.syncService.resolveConflict(
                    entityType,
                    entityId,
                    projectId,
                    resolution,
                );
            },
        );

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
                    repo.project,
                ),
                editChapters: new EditChapters(
                    svc.aiText,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.organization,
                    repo.project,
                ),
                generalChat: new GeneralChat(
                    svc.aiText,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.organization,
                    repo.chatConversation,
                    repo.project,
                ),
                loadChatHistory: new LoadChatHistory(repo.chatConversation),
                loadChatMessages: new LoadChatMessages(repo.chatConversation),
            },
            asset: {
                deleteAsset: new DeleteAsset(
                    repo.asset,
                    svc.storage,
                    repo.character,
                    repo.location,
                    repo.organization,
                ),
                importAsset: new ImportAsset(
                    repo.asset,
                    svc.storage,
                    repo.character,
                    repo.location,
                    repo.organization,
                    repo.chapter,
                    repo.project,
                ),
            },
            auth: {
                loginUser: new LoginUser(svc.auth, repo.user, svc.sessionStore),
                logoutUser: new LogoutUser(svc.auth, svc.sessionStore),
                registerUser: new RegisterUser(svc.auth, repo.user),
                loadStoredSession: new LoadStoredSession(
                    svc.sessionStore,
                    svc.auth,
                ),
                updateEmail: new UpdateUserEmail(
                    svc.auth,
                    repo.user,
                    svc.sessionStore,
                ),
                updatePassword: new UpdateUserPassword(
                    svc.auth,
                    repo.user,
                    svc.sessionStore,
                ),
                resetPassword: new ResetPassword(svc.auth),
                deleteAccount: new DeleteAccount(
                    svc.auth,
                    svc.sessionStore,
                    repo.project,
                    repo.asset,
                    svc.storage,
                ),
            },
            metafield: {
                listProjectMetafields: new ListProjectMetafields(
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                ),
                createOrReuseMetafieldDefinition:
                    new CreateOrReuseMetafieldDefinition(
                        repo.metafieldDefinition,
                    ),
                assignMetafieldToEntity: new AssignMetafieldToEntity(
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                ),
                saveMetafieldValue: new SaveMetafieldValue(
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                ),
                saveMetafieldSelectOptions: new SaveMetafieldSelectOptions(
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                ),
                saveEditorTemplate: new SaveEditorTemplate(
                    repo.editorTemplate,
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                    repo.character,
                    repo.location,
                    repo.organization,
                ),
                removeMetafieldFromEntity: new RemoveMetafieldFromEntity(
                    repo.metafieldAssignment,
                ),
                deleteMetafieldDefinitionGlobal:
                    new DeleteMetafieldDefinitionGlobal(
                        repo.metafieldDefinition,
                        repo.metafieldAssignment,
                    ),
            },
            support: {
                submitBugReport: new SubmitBugReport(repo.bugReport),
            },
            generation: {
                generateCharacterImage: new GenerateCharacterImage(
                    repo.character,
                    repo.asset,
                    svc.imageGeneration,
                    svc.storage,
                ),
                generateCharacterPlaylist: new GenerateCharacterPlaylist(
                    repo.character,
                    svc.playlistGeneration,
                    repo.asset,
                    svc.storage,
                ),
                generateCharacterSong: new GenerateCharacterSong(
                    repo.character,
                    svc.audioGeneration,
                    svc.storage,
                    repo.asset,
                ),
                generateLocationImage: new GenerateLocationImage(
                    repo.location,
                    repo.asset,
                    svc.imageGeneration,
                    svc.storage,
                ),
                generateLocationPlaylist: new GenerateLocationPlaylist(
                    repo.location,
                    svc.playlistGeneration,
                    repo.asset,
                    svc.storage,
                ),
                generateLocationSong: new GenerateLocationSong(
                    repo.location,
                    svc.audioGeneration,
                    svc.storage,
                    repo.asset,
                ),
                generateOrganizationImage: new GenerateOrganizationImage(
                    repo.organization,
                    repo.asset,
                    svc.imageGeneration,
                    svc.storage,
                ),
                generateOrganizationPlaylist: new GenerateOrganizationPlaylist(
                    repo.organization,
                    svc.playlistGeneration,
                    repo.asset,
                    svc.storage,
                ),
                generateOrganizationSong: new GenerateOrganizationSong(
                    repo.organization,
                    svc.audioGeneration,
                    svc.storage,
                    repo.asset,
                ),
            },
            logistics: {
                saveChapterContent: new SaveChapterContent(repo.chapter),
                saveCharacterInfo: new SaveCharacterInfo(
                    repo.character,
                    repo.location,
                    repo.organization,
                ),
                saveLocationInfo: new SaveLocationInfo(
                    repo.location,
                    repo.project,
                ),
                reorderLocationChildren: new ReorderLocationChildren(
                    repo.location,
                    repo.project,
                ),
                saveManuscriptStructure: new SaveManuscriptStructure(
                    repo.project,
                    repo.chapter,
                ),
                saveOrganizationInfo: new SaveOrganizationInfo(
                    repo.organization,
                    repo.location,
                ),
                saveProjectSettings: new SaveProjectSettings(repo.project),
                saveUserSettings: new SaveUserSettings(
                    repo.user,
                    svc.sessionStore,
                ),
            },
            manuscript: {
                createChapter: new CreateChapter(repo.chapter, repo.project),
                createScrapNote: new CreateScrapNote(
                    repo.scrapNote,
                    repo.project,
                ),
                deleteChapter: new DeleteChapter(repo.chapter, repo.project),
                deleteScrapNote: new DeleteScrapNote(
                    repo.scrapNote,
                    repo.project,
                ),
                moveChapter: new MoveChapter(repo.project, repo.chapter),
                overwriteChapter: new OverwriteChapter(repo.chapter),
                overwriteScrapNote: new OverwriteScrapNote(repo.scrapNote),
                renameChapter: new RenameChapter(repo.chapter),
                updateScrapNote: new UpdateScrapNote(repo.scrapNote),
            },
            project: {
                createProject: new CreateProject(
                    repo.project,
                    repo.user,
                    repo.timeline,
                    repo.metafieldDefinition,
                    repo.editorTemplate,
                ),
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
                    repo.user,
                ),
                exportManuscript: new ExportManuscript(svc.export),
                importProject: new ImportProject(
                    svc.epubImport,
                    repo.project,
                    repo.chapter,
                    repo.timeline,
                    repo.user,
                    svc.storage,
                    repo.asset,
                    repo.metafieldDefinition,
                    repo.editorTemplate,
                ),
                loadProjectList: new LoadProjectList(repo.project, repo.asset),
                openProject: new OpenProject(
                    repo.project,
                    repo.chapter,
                    repo.character,
                    repo.location,
                    repo.scrapNote,
                    repo.organization,
                    repo.asset,
                    repo.timeline,
                    repo.event,
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                    repo.editorTemplate,
                ),
                renameProject: new RenameProject(repo.project),
                reorderProjectItems: new ReorderProjectItems(repo.project),
            },
            world: {
                createCharacter: new CreateCharacter(
                    repo.character,
                    repo.project,
                    repo.editorTemplate,
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                ),
                createLocation: new CreateLocation(
                    repo.location,
                    repo.project,
                    repo.editorTemplate,
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                ),
                createOrganization: new CreateOrganization(
                    repo.organization,
                    repo.project,
                    repo.editorTemplate,
                    repo.metafieldDefinition,
                    repo.metafieldAssignment,
                ),
                deleteCharacter: new DeleteCharacter(
                    repo.character,
                    repo.location,
                    repo.project,
                    repo.asset,
                    svc.storage,
                ),
                deleteLocation: new DeleteLocation(
                    repo.location,
                    repo.project,
                    repo.character,
                    repo.organization,
                    repo.asset,
                    svc.storage,
                ),
                deleteOrganization: new DeleteOrganization(
                    repo.organization,
                    repo.project,
                    repo.character,
                    repo.location,
                    repo.asset,
                    svc.storage,
                ),
                overwriteCharacter: new OverwriteCharacter(
                    repo.character,
                    repo.location,
                    repo.organization,
                ),
                overwriteLocation: new OverwriteLocation(
                    repo.location,
                    repo.character,
                    repo.organization,
                ),
                overwriteOrganization: new OverwriteOrganization(
                    repo.organization,
                    repo.location,
                ),
            },
            timeline: {
                createTimeline: new CreateTimeline(repo.timeline, repo.project),
                updateTimeline: new UpdateTimeline(repo.timeline),
                deleteTimeline: new DeleteTimeline(repo.timeline, repo.project),
                createEvent: new CreateEvent(
                    repo.event,
                    repo.timeline,
                    repo.chapter,
                    repo.scrapNote,
                ),
                updateEvent: new UpdateEvent(repo.event),
                deleteEvent: new DeleteEvent(
                    repo.event,
                    repo.timeline,
                    repo.chapter,
                    repo.scrapNote,
                ),
            },
        };
    }

    private createControllers(useCases: UseCaseMap): ControllerInstanceMap {
        return {
            analysis: {
                analyzeText: new AnalyzeTextController(
                    useCases.analysis.analyzeText,
                ),
                editChapters: new EditChaptersController(
                    useCases.analysis.editChapters,
                ),
                generalChat: new GeneralChatController(
                    useCases.analysis.generalChat,
                ),
                loadChatHistory: new LoadChatHistoryController(
                    useCases.analysis.loadChatHistory,
                ),
                loadChatMessages: new LoadChatMessagesController(
                    useCases.analysis.loadChatMessages,
                ),
            },
            asset: {
                deleteAsset: new DeleteAssetController(
                    useCases.asset.deleteAsset,
                ),
                importAsset: new ImportAssetController(
                    useCases.asset.importAsset,
                ),
            },
            auth: {
                loginUser: new LoginUserController(
                    useCases.auth.loginUser,
                    this.authStateGateway,
                    this.dependencies.services.guestTransition,
                ),
                logoutUser: new LogoutUserController(
                    useCases.auth.logoutUser,
                    this.authStateGateway,
                ),
                registerUser: new RegisterUserController(
                    useCases.auth.registerUser,
                ),
                getState: new GetAuthStateController(this.authStateGateway),
                resolveGuestTransition: new ResolveGuestTransitionController(
                    this.dependencies.services.guestTransition,
                    this.dependencies.services.auth,
                    this.dependencies.services.sessionStore,
                    this.authStateGateway,
                ),
                updateEmail: new UpdateUserEmailController(
                    useCases.auth.updateEmail,
                    this.authStateGateway,
                ),
                updatePassword: new UpdateUserPasswordController(
                    useCases.auth.updatePassword,
                    this.authStateGateway,
                ),
                resetPassword: new ResetPasswordController(
                    useCases.auth.resetPassword,
                ),
                deleteAccount: new DeleteAccountController(
                    useCases.auth.deleteAccount,
                    this.authStateGateway,
                ),
            },
            metafield: {
                listProjectMetafields: new ListProjectMetafieldsController(
                    useCases.metafield.listProjectMetafields,
                ),
                createOrReuseMetafieldDefinition:
                    new CreateOrReuseMetafieldDefinitionController(
                        useCases.metafield.createOrReuseMetafieldDefinition,
                    ),
                assignMetafieldToEntity: new AssignMetafieldToEntityController(
                    useCases.metafield.assignMetafieldToEntity,
                ),
                saveMetafieldValue: new SaveMetafieldValueController(
                    useCases.metafield.saveMetafieldValue,
                ),
                saveMetafieldSelectOptions:
                    new SaveMetafieldSelectOptionsController(
                        useCases.metafield.saveMetafieldSelectOptions,
                    ),
                saveEditorTemplate: new SaveEditorTemplateController(
                    useCases.metafield.saveEditorTemplate,
                ),
                removeMetafieldFromEntity:
                    new RemoveMetafieldFromEntityController(
                        useCases.metafield.removeMetafieldFromEntity,
                    ),
                deleteMetafieldDefinitionGlobal:
                    new DeleteMetafieldDefinitionGlobalController(
                        useCases.metafield.deleteMetafieldDefinitionGlobal,
                    ),
            },
            support: {
                submitBugReport: new SubmitBugReportController(
                    useCases.support.submitBugReport,
                ),
            },
            generation: {
                generateCharacterImage: new GenerateCharacterImageController(
                    useCases.generation.generateCharacterImage,
                ),
                generateCharacterPlaylist:
                    new GenerateCharacterPlaylistController(
                        useCases.generation.generateCharacterPlaylist,
                    ),
                generateCharacterSong: new GenerateCharacterSongController(
                    useCases.generation.generateCharacterSong,
                ),
                generateLocationImage: new GenerateLocationImageController(
                    useCases.generation.generateLocationImage,
                ),
                generateLocationPlaylist:
                    new GenerateLocationPlaylistController(
                        useCases.generation.generateLocationPlaylist,
                    ),
                generateLocationSong: new GenerateLocationSongController(
                    useCases.generation.generateLocationSong,
                ),
                generateOrganizationImage:
                    new GenerateOrganizationImageController(
                        useCases.generation.generateOrganizationImage,
                    ),
                generateOrganizationPlaylist:
                    new GenerateOrganizationPlaylistController(
                        useCases.generation.generateOrganizationPlaylist,
                    ),
                generateOrganizationSong:
                    new GenerateOrganizationSongController(
                        useCases.generation.generateOrganizationSong,
                    ),
            },
            logistics: {
                saveChapterContent: new SaveChapterContentController(
                    useCases.logistics.saveChapterContent,
                ),
                saveCharacterInfo: new SaveCharacterInfoController(
                    useCases.logistics.saveCharacterInfo,
                ),
                saveLocationInfo: new SaveLocationInfoController(
                    useCases.logistics.saveLocationInfo,
                ),
                reorderLocationChildren: new ReorderLocationChildrenController(
                    useCases.logistics.reorderLocationChildren,
                ),
                saveManuscriptStructure: new SaveManuscriptStructureController(
                    useCases.logistics.saveManuscriptStructure,
                ),
                saveOrganizationInfo: new SaveOrganizationInfoController(
                    useCases.logistics.saveOrganizationInfo,
                ),
                saveProjectSettings: new SaveProjectSettingsController(
                    useCases.logistics.saveProjectSettings,
                ),
                saveUserSettings: new SaveUserSettingsController(
                    useCases.logistics.saveUserSettings,
                ),
            },
            manuscript: {
                createChapter: new CreateChapterController(
                    useCases.manuscript.createChapter,
                ),
                createScrapNote: new CreateScrapNoteController(
                    useCases.manuscript.createScrapNote,
                ),
                deleteChapter: new DeleteChapterController(
                    useCases.manuscript.deleteChapter,
                ),
                deleteScrapNote: new DeleteScrapNoteController(
                    useCases.manuscript.deleteScrapNote,
                ),
                moveChapter: new MoveChapterController(
                    useCases.manuscript.moveChapter,
                ),
                renameChapter: new RenameChapterController(
                    useCases.manuscript.renameChapter,
                ),
                updateScrapNote: new UpdateScrapNoteController(
                    useCases.manuscript.updateScrapNote,
                ),
                overwriteChapter: new OverwriteChapterController(
                    useCases.manuscript.overwriteChapter,
                ),
                overwriteScrapNote: new OverwriteScrapNoteController(
                    useCases.manuscript.overwriteScrapNote,
                ),
            },
            project: {
                createProject: new CreateProjectController(
                    useCases.project.createProject,
                ),
                deleteProject: new DeleteProjectController(
                    useCases.project.deleteProject,
                ),
                exportManuscript: new ExportManuscriptController(
                    useCases.project.exportManuscript,
                ),
                importProject: new ImportProjectController(
                    useCases.project.importProject,
                ),
                loadProjectList: new LoadProjectListController(
                    useCases.project.loadProjectList,
                ),
                openProject: new OpenProjectController(
                    useCases.project.openProject,
                ),
                renameProject: new RenameProjectController(
                    useCases.project.renameProject,
                ),
                reorderProjectItems: new ReorderProjectItemsController(
                    useCases.project.reorderProjectItems,
                ),
            },
            sync: {
                getSyncState: new GetSyncStateController(this.syncStateGateway),
            },
            world: {
                createCharacter: new CreateCharacterController(
                    useCases.world.createCharacter,
                ),
                createLocation: new CreateLocationController(
                    useCases.world.createLocation,
                ),
                createOrganization: new CreateOrganizationController(
                    useCases.world.createOrganization,
                ),
                deleteCharacter: new DeleteCharacterController(
                    useCases.world.deleteCharacter,
                ),
                deleteLocation: new DeleteLocationController(
                    useCases.world.deleteLocation,
                ),
                deleteOrganization: new DeleteOrganizationController(
                    useCases.world.deleteOrganization,
                ),
                overwriteCharacter: new OverwriteCharacterController(
                    useCases.world.overwriteCharacter,
                ),
                overwriteLocation: new OverwriteLocationController(
                    useCases.world.overwriteLocation,
                ),
                overwriteOrganization: new OverwriteOrganizationController(
                    useCases.world.overwriteOrganization,
                ),
            },
            timeline: {
                createTimeline: new CreateTimelineController(
                    useCases.timeline.createTimeline,
                ),
                updateTimeline: new UpdateTimelineController(
                    useCases.timeline.updateTimeline,
                ),
                deleteTimeline: new DeleteTimelineController(
                    useCases.timeline.deleteTimeline,
                ),
                createEvent: new CreateEventController(
                    useCases.timeline.createEvent,
                ),
                updateEvent: new UpdateEventController(
                    useCases.timeline.updateEvent,
                ),
                deleteEvent: new DeleteEventController(
                    useCases.timeline.deleteEvent,
                ),
            },
        };
    }

    private async initializeAuthState(
        loadStoredSession: LoadStoredSession,
    ): Promise<void> {
        try {
            const { user } = await loadStoredSession.execute();
            this.authStateGateway.setUser(user);
        } catch (error) {
            console.error("Failed to initialize auth state", error);
            this.authStateGateway.setUser(null);
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

                if (channel === controllerChannels.project.createProject) {
                    ipcMain.handle(channel, async (event, ...args) => {
                        const result = await invokeController(
                            controller,
                            event,
                            args,
                        );
                        await setupService.markFirstProjectCreated();
                        return result;
                    });
                    continue;
                }

                ipcMain.handle(channel, (event, ...args) =>
                    invokeController(controller, event, args),
                );
            }
        }
    }
}
