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

export function resolveDependencies(): AppBuilderDependencies {
    const projectRepository = new SupabaseProjectRepository();
    const chapterRepository = new SupabaseChapterRepository();
    const userRepository = new SupabaseUserRepository();
    const scrapNoteRepository = new SupabaseScrapNoteRepository();
    const characterRepository = new SupabaseCharacterRepository();
    const locationRepository = new SupabaseLocationRepository();
    const organizationRepository = new SupabaseOrganizationRepository();
    const chatConversationRepository = new SupabaseChatConversationRepository();
    const assetRepository = new SupabaseAssetRepository();
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
    };
}
