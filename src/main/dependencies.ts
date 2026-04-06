import type { AppBuilderDependencies } from "./AppBuilder";

import { SupabaseProjectRepository } from "../@infrastructure/db/SupabaseProjectRepository";
import { SupabaseChapterRepository } from "../@infrastructure/db/SupabaseChapterRepository";
import { SupabaseUserRepository } from "../@infrastructure/db/SupabaseUserRepository";
import { SupabaseScrapNoteRepository } from "../@infrastructure/db/SupabaseScrapNoteRepository";
import { SupabaseCharacterRepository } from "../@infrastructure/db/SupabaseCharacterRepository";
import { SupabaseLocationRepository } from "../@infrastructure/db/SupabaseLocationRepository";
import { SupabaseOrganizationRepository } from "../@infrastructure/db/SupabaseOrganizationRepository";
import { SupabaseChatConversationRepository } from "../@infrastructure/db/SupabaseChatConversationRepository";
import { FileSystemChatConversationRepository } from "../@infrastructure/db/filesystem/FileSystemChatConversationRepository";
import { OfflineFirstChatConversationRepository } from "../@infrastructure/db/offline/OfflineFirstChatConversationRepository";
import { SupabaseAssetRepository } from "../@infrastructure/db/SupabaseAssetRepository";
import { SupabaseAuthService } from "../@infrastructure/db/SupabaseAuthService";
import { SupabaseStorageService } from "../@infrastructure/storage/SupabaseStorageService";
import { FileSystemStorageService } from "../@infrastructure/storage/FileSystemStorageService";
import { SessionAwareStorageService } from "../@infrastructure/storage/SessionAwareStorageService";
import { FilesystemUserSessionStore } from "../@infrastructure/storage/FilesystemUserSessionStore";
import { GeminiAITextService } from "../@infrastructure/ai/GeminiAITextService";
import { ComfyAssetGenerationService } from "../@infrastructure/ai/ComfyAssetGenerationService";
import { PlaylistGenerationService } from "../@infrastructure/ai/PlaylistGenerationService";
import { ExportService } from "../@infrastructure/ai/ExportService";
import { EpubImportService } from "../@infrastructure/services/EpubImportService";
import { GuestSessionTransitionService } from "../@infrastructure/services/GuestSessionTransitionService";

import { FileSystemProjectRepository } from "../@infrastructure/db/filesystem/FileSystemProjectRepository";
import { OfflineFirstProjectRepository } from "../@infrastructure/db/offline/OfflineFirstProjectRepository";
import { FileSystemChapterRepository } from "../@infrastructure/db/filesystem/FileSystemChapterRepository";
import { OfflineFirstChapterRepository } from "../@infrastructure/db/offline/OfflineFirstChapterRepository";
import { FileSystemCharacterRepository } from "../@infrastructure/db/filesystem/FileSystemCharacterRepository";
import { OfflineFirstCharacterRepository } from "../@infrastructure/db/offline/OfflineFirstCharacterRepository";
import { FileSystemLocationRepository } from "../@infrastructure/db/filesystem/FileSystemLocationRepository";
import { OfflineFirstLocationRepository } from "../@infrastructure/db/offline/OfflineFirstLocationRepository";
import { FileSystemOrganizationRepository } from "../@infrastructure/db/filesystem/FileSystemOrganizationRepository";
import { OfflineFirstOrganizationRepository } from "../@infrastructure/db/offline/OfflineFirstOrganizationRepository";
import { FileSystemScrapNoteRepository } from "../@infrastructure/db/filesystem/FileSystemScrapNoteRepository";
import { OfflineFirstScrapNoteRepository } from "../@infrastructure/db/offline/OfflineFirstScrapNoteRepository";
import { FileSystemAssetRepository } from "../@infrastructure/db/filesystem/FileSystemAssetRepository";
import { OfflineFirstAssetRepository } from "../@infrastructure/db/offline/OfflineFirstAssetRepository";
import { FileSystemMetafieldDefinitionRepository } from "../@infrastructure/db/filesystem/FileSystemMetafieldDefinitionRepository";
import { FileSystemMetafieldAssignmentRepository } from "../@infrastructure/db/filesystem/FileSystemMetafieldAssignmentRepository";
import { OfflineFirstMetafieldDefinitionRepository } from "../@infrastructure/db/offline/OfflineFirstMetafieldDefinitionRepository";
import { OfflineFirstMetafieldAssignmentRepository } from "../@infrastructure/db/offline/OfflineFirstMetafieldAssignmentRepository";
import { FileSystemUserRepository } from "../@infrastructure/db/filesystem/FileSystemUserRepository";
import { OfflineFirstUserRepository } from "../@infrastructure/db/offline/OfflineFirstUserRepository";
import { SynchronizationService } from "../@infrastructure/services/SynchronizationService";
import { SupabaseDeletionLogRepository } from "../@infrastructure/db/SupabaseDeletionLogRepository";
import { SupabaseTimelineRepository } from "../@infrastructure/db/SupabaseTimelineRepository";
import { SupabaseEventRepository } from "../@infrastructure/db/SupabaseEventRepository";
import { FileSystemTimelineRepository } from "../@infrastructure/db/filesystem/FileSystemTimelineRepository";
import { FileSystemEventRepository } from "../@infrastructure/db/filesystem/FileSystemEventRepository";
import { OfflineFirstTimelineRepository } from "../@infrastructure/db/offline/OfflineFirstTimelineRepository";
import { OfflineFirstEventRepository } from "../@infrastructure/db/offline/OfflineFirstEventRepository";
import { SupabaseMetafieldDefinitionRepository } from "../@infrastructure/db/SupabaseMetafieldDefinitionRepository";
import { SupabaseMetafieldAssignmentRepository } from "../@infrastructure/db/SupabaseMetafieldAssignmentRepository";
import { SupabaseEditorTemplateRepository } from "../@infrastructure/db/SupabaseEditorTemplateRepository";
import { SupabaseBugReportRepository } from "../@infrastructure/db/SupabaseBugReportRepository";
import { FileSystemEditorTemplateRepository } from "../@infrastructure/db/filesystem/FileSystemEditorTemplateRepository";
import { OfflineFirstEditorTemplateRepository } from "../@infrastructure/db/offline/OfflineFirstEditorTemplateRepository";

export function resolveDependencies(): AppBuilderDependencies {
    const supabaseProjectRepo = new SupabaseProjectRepository();
    const fsProjectRepo = new FileSystemProjectRepository();
    const projectRepository = new OfflineFirstProjectRepository(
        supabaseProjectRepo,
        fsProjectRepo,
    );

    const supabaseChapterRepo = new SupabaseChapterRepository();
    const fsChapterRepo = new FileSystemChapterRepository();
    const chapterRepository = new OfflineFirstChapterRepository(
        supabaseChapterRepo,
        fsChapterRepo,
    );

    const supabaseCharacterRepo = new SupabaseCharacterRepository();
    const fsCharacterRepo = new FileSystemCharacterRepository();
    const characterRepository = new OfflineFirstCharacterRepository(
        supabaseCharacterRepo,
        fsCharacterRepo,
    );

    const supabaseLocationRepo = new SupabaseLocationRepository();
    const fsLocationRepo = new FileSystemLocationRepository();
    const locationRepository = new OfflineFirstLocationRepository(
        supabaseLocationRepo,
        fsLocationRepo,
    );

    const supabaseOrganizationRepo = new SupabaseOrganizationRepository();
    const fsOrganizationRepo = new FileSystemOrganizationRepository();
    const organizationRepository = new OfflineFirstOrganizationRepository(
        supabaseOrganizationRepo,
        fsOrganizationRepo,
    );

    const supabaseScrapNoteRepo = new SupabaseScrapNoteRepository();
    const fsScrapNoteRepo = new FileSystemScrapNoteRepository();
    const scrapNoteRepository = new OfflineFirstScrapNoteRepository(
        supabaseScrapNoteRepo,
        fsScrapNoteRepo,
    );

    const supabaseAssetRepo = new SupabaseAssetRepository();
    const fsAssetRepo = new FileSystemAssetRepository();
    const assetRepository = new OfflineFirstAssetRepository(
        supabaseAssetRepo,
        fsAssetRepo,
    );

    const supabaseUserRepo = new SupabaseUserRepository();
    const fsUserRepo = new FileSystemUserRepository();
    const userRepository = new OfflineFirstUserRepository(
        supabaseUserRepo,
        fsUserRepo,
    );
    const guestTransitionService = new GuestSessionTransitionService(
        fsUserRepo,
    );
    const supabaseChatConversationRepo =
        new SupabaseChatConversationRepository();
    const fsChatConversationRepo = new FileSystemChatConversationRepository();
    const chatConversationRepository =
        new OfflineFirstChatConversationRepository(
            supabaseChatConversationRepo,
            fsChatConversationRepo,
        );
    const authService = new SupabaseAuthService();
    const sessionStore = new FilesystemUserSessionStore();
    const storageService = new SessionAwareStorageService(
        sessionStore,
        new SupabaseStorageService(),
        new FileSystemStorageService(),
    );

    const aiTextService = new GeminiAITextService(
        sessionStore,
        chapterRepository,
        characterRepository,
        locationRepository,
        organizationRepository,
        scrapNoteRepository,
    );
    const comfyAssetGenerationService = new ComfyAssetGenerationService(
        sessionStore,
        chapterRepository,
        characterRepository,
        locationRepository,
        organizationRepository,
        scrapNoteRepository,
    );
    const audioGenerationService = comfyAssetGenerationService;
    const imageGenerationService = comfyAssetGenerationService;

    const playlistGenerationService = new PlaylistGenerationService(
        sessionStore,
        locationRepository,
    );
    const exportService = new ExportService(
        projectRepository,
        chapterRepository,
    );

    const epubImportService = new EpubImportService();

    const supabaseDeletionLogRepo = new SupabaseDeletionLogRepository();

    const supabaseTimelineRepo = new SupabaseTimelineRepository();
    const supabaseEventRepo = new SupabaseEventRepository();
    const fsTimelineRepo = new FileSystemTimelineRepository();
    const fsEventRepo = new FileSystemEventRepository();
    const timelineRepository = new OfflineFirstTimelineRepository(
        supabaseTimelineRepo,
        fsTimelineRepo,
    );
    const eventRepository = new OfflineFirstEventRepository(
        supabaseEventRepo,
        fsEventRepo,
    );
    const supabaseMetafieldDefinitionRepo =
        new SupabaseMetafieldDefinitionRepository();
    const supabaseMetafieldAssignmentRepo =
        new SupabaseMetafieldAssignmentRepository();
    const supabaseBugReportRepo = new SupabaseBugReportRepository();
    const supabaseEditorTemplateRepo = new SupabaseEditorTemplateRepository();
    const fsMetafieldDefinitionRepo =
        new FileSystemMetafieldDefinitionRepository();
    const fsMetafieldAssignmentRepo =
        new FileSystemMetafieldAssignmentRepository();
    const fsEditorTemplateRepo = new FileSystemEditorTemplateRepository();
    const metafieldDefinitionRepository =
        new OfflineFirstMetafieldDefinitionRepository(
            supabaseMetafieldDefinitionRepo,
            fsMetafieldDefinitionRepo,
        );
    const metafieldAssignmentRepository =
        new OfflineFirstMetafieldAssignmentRepository(
            supabaseMetafieldAssignmentRepo,
            fsMetafieldAssignmentRepo,
        );
    const editorTemplateRepository = new OfflineFirstEditorTemplateRepository(
        supabaseEditorTemplateRepo,
        fsEditorTemplateRepo,
    );

    const syncService = new SynchronizationService(
        supabaseProjectRepo,
        fsProjectRepo,
        supabaseChapterRepo,
        fsChapterRepo,
        supabaseCharacterRepo,
        fsCharacterRepo,
        supabaseLocationRepo,
        fsLocationRepo,
        supabaseOrganizationRepo,
        fsOrganizationRepo,
        supabaseScrapNoteRepo,
        fsScrapNoteRepo,
        supabaseAssetRepo,
        fsAssetRepo,
        supabaseMetafieldDefinitionRepo,
        fsMetafieldDefinitionRepo,
        supabaseMetafieldAssignmentRepo,
        fsMetafieldAssignmentRepo,
        supabaseEditorTemplateRepo,
        fsEditorTemplateRepo,
        supabaseDeletionLogRepo,
    );

    return {
        repositories: {
            asset: assetRepository,
            chapter: chapterRepository,
            character: characterRepository,
            chatConversation: chatConversationRepository,
            location: locationRepository,
            organization: organizationRepository,
            timeline: timelineRepository,
            event: eventRepository,
            metafieldDefinition: metafieldDefinitionRepository,
            metafieldAssignment: metafieldAssignmentRepository,
            editorTemplate: editorTemplateRepository,
            bugReport: supabaseBugReportRepo,
            project: projectRepository,
            scrapNote: scrapNoteRepository,
            user: userRepository,
        },
        services: {
            aiText: aiTextService,
            audioGeneration: audioGenerationService,
            auth: authService,
            export: exportService,
            epubImport: epubImportService,
            imageGeneration: imageGenerationService,
            playlistGeneration: playlistGenerationService,
            storage: storageService,
            sessionStore,
            guestTransition: guestTransitionService,
        },
        syncService: syncService,
    };
}
