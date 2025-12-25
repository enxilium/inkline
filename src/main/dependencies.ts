import type { AppBuilderDependencies } from "./AppBuilder";

import { SupabaseProjectRepository } from "../@infrastructure/db/SupabaseProjectRepository";
import { SupabaseChapterRepository } from "../@infrastructure/db/SupabaseChapterRepository";
import { SupabaseUserRepository } from "../@infrastructure/db/SupabaseUserRepository";
import { SupabaseScrapNoteRepository } from "../@infrastructure/db/SupabaseScrapNoteRepository";
import { SupabaseCharacterRepository } from "../@infrastructure/db/SupabaseCharacterRepository";
import { SupabaseLocationRepository } from "../@infrastructure/db/SupabaseLocationRepository";
import { SupabaseOrganizationRepository } from "../@infrastructure/db/SupabaseOrganizationRepository";
import { SupabaseChatConversationRepository } from "../@infrastructure/db/SupabaseChatConversationRepository";
import { SupabaseAssetRepository } from "../@infrastructure/db/SupabaseAssetRepository";
import { SupabaseAuthService } from "../@infrastructure/db/SupabaseAuthService";
import { SupabaseStorageService } from "../@infrastructure/storage/SupabaseStorageService";
import { FilesystemUserSessionStore } from "../@infrastructure/storage/FilesystemUserSessionStore";
import { GeminiAITextService } from "../@infrastructure/ai/GeminiAITextService";
import { ComfyAssetGenerationService } from "../@infrastructure/ai/ComfyAssetGenerationService";
import { PlaylistGenerationService } from "../@infrastructure/ai/PlaylistGenerationService";
import { ExportService } from "../@infrastructure/ai/ExportService";

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
import { SynchronizationService } from "../@infrastructure/services/SynchronizationService";
import { SupabaseDeletionLogRepository } from "../@infrastructure/db/SupabaseDeletionLogRepository";

export function resolveDependencies(): AppBuilderDependencies {
    const supabaseProjectRepo = new SupabaseProjectRepository();
    const fsProjectRepo = new FileSystemProjectRepository();
    const projectRepository = new OfflineFirstProjectRepository(
        supabaseProjectRepo,
        fsProjectRepo
    );

    const supabaseChapterRepo = new SupabaseChapterRepository();
    const fsChapterRepo = new FileSystemChapterRepository();
    const chapterRepository = new OfflineFirstChapterRepository(
        supabaseChapterRepo,
        fsChapterRepo
    );

    const supabaseCharacterRepo = new SupabaseCharacterRepository();
    const fsCharacterRepo = new FileSystemCharacterRepository();
    const characterRepository = new OfflineFirstCharacterRepository(
        supabaseCharacterRepo,
        fsCharacterRepo
    );

    const supabaseLocationRepo = new SupabaseLocationRepository();
    const fsLocationRepo = new FileSystemLocationRepository();
    const locationRepository = new OfflineFirstLocationRepository(
        supabaseLocationRepo,
        fsLocationRepo
    );

    const supabaseOrganizationRepo = new SupabaseOrganizationRepository();
    const fsOrganizationRepo = new FileSystemOrganizationRepository();
    const organizationRepository = new OfflineFirstOrganizationRepository(
        supabaseOrganizationRepo,
        fsOrganizationRepo
    );

    const supabaseScrapNoteRepo = new SupabaseScrapNoteRepository();
    const fsScrapNoteRepo = new FileSystemScrapNoteRepository();
    const scrapNoteRepository = new OfflineFirstScrapNoteRepository(
        supabaseScrapNoteRepo,
        fsScrapNoteRepo
    );

    const supabaseAssetRepo = new SupabaseAssetRepository();
    const fsAssetRepo = new FileSystemAssetRepository();
    const assetRepository = new OfflineFirstAssetRepository(
        supabaseAssetRepo,
        fsAssetRepo
    );

    const userRepository = new SupabaseUserRepository();
    const chatConversationRepository = new SupabaseChatConversationRepository();
    const authService = new SupabaseAuthService();
    const storageService = new SupabaseStorageService();
    const sessionStore = new FilesystemUserSessionStore();

    const aiTextService = new GeminiAITextService(
        sessionStore,
        chapterRepository,
        characterRepository,
        locationRepository,
        organizationRepository,
        scrapNoteRepository
    );
    const comfyAssetGenerationService = new ComfyAssetGenerationService(
        sessionStore,
        chapterRepository,
        characterRepository,
        locationRepository,
        organizationRepository,
        scrapNoteRepository
    );
    const audioGenerationService = comfyAssetGenerationService;
    const imageGenerationService = comfyAssetGenerationService;

    const playlistGenerationService = new PlaylistGenerationService(
        sessionStore,
        locationRepository
    );
    const exportService = new ExportService(
        projectRepository,
        chapterRepository
    );

    const supabaseDeletionLogRepo = new SupabaseDeletionLogRepository();

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
        supabaseDeletionLogRepo
    );

    return {
        repositories: {
            asset: assetRepository,
            chapter: chapterRepository,
            character: characterRepository,
            chatConversation: chatConversationRepository,
            location: locationRepository,
            organization: organizationRepository,
            project: projectRepository,
            scrapNote: scrapNoteRepository,
            user: userRepository,
        },
        services: {
            aiText: aiTextService,
            audioGeneration: audioGenerationService,
            auth: authService,
            export: exportService,
            imageGeneration: imageGenerationService,
            playlistGeneration: playlistGenerationService,
            storage: storageService,
            sessionStore,
        },
        syncService: syncService,
    };
}
