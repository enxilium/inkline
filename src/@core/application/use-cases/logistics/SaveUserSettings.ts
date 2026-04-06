import { UserPreferences } from "../../../domain/entities/user/UserPreferences";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import {
    IUserSessionStore,
    type LocalSessionPreferences,
} from "../../../domain/services/IUserSessionStore";

export interface SaveUserSettingsRequest {
    userId: string;
    preferences: Partial<UserPreferences>;
}

export class SaveUserSettings {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly sessionStore: IUserSessionStore,
    ) {}

    async execute(request: SaveUserSettingsRequest): Promise<void> {
        const { userId, preferences } = request;
        const normalizedAccent = preferences.accentColor?.trim();
        const localPreferencesPatch: LocalSessionPreferences = {};

        if (!userId.trim()) {
            throw new Error("User ID is required.");
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error("User not found.");
        }

        const updatedPreferences = new UserPreferences(
            preferences.theme ?? user.preferences.theme,
            normalizedAccent ?? user.preferences.accentColor,
            preferences.editorFontSize ?? user.preferences.editorFontSize,
            preferences.editorFontFamily ?? user.preferences.editorFontFamily,
            preferences.defaultImageAiModel ??
                user.preferences.defaultImageAiModel,
            preferences.geminiApiKey ?? user.preferences.geminiApiKey,
        );

        if (
            preferences.editorFontSize !== undefined &&
            preferences.editorFontSize <= 0
        ) {
            throw new Error("Editor font size must be greater than zero.");
        }

        if (
            normalizedAccent !== undefined &&
            !/^#[0-9a-fA-F]{6}$/.test(normalizedAccent)
        ) {
            throw new Error("Accent color must be a valid hex color.");
        }

        if (preferences.theme !== undefined) {
            localPreferencesPatch.theme = preferences.theme;
        }

        if (normalizedAccent !== undefined) {
            localPreferencesPatch.accentColor = normalizedAccent;
        }

        if (preferences.editorFontSize !== undefined) {
            localPreferencesPatch.editorFontSize = preferences.editorFontSize;
        }

        if (preferences.editorFontFamily !== undefined) {
            localPreferencesPatch.editorFontFamily =
                preferences.editorFontFamily;
        }

        if (preferences.defaultImageAiModel !== undefined) {
            localPreferencesPatch.defaultImageAiModel =
                preferences.defaultImageAiModel;
        }

        if (preferences.geminiApiKey !== undefined) {
            localPreferencesPatch.geminiApiKey = preferences.geminiApiKey;
        }

        // Check if anything actually changed
        const hasChanges =
            user.preferences.theme !== updatedPreferences.theme ||
            user.preferences.accentColor !== updatedPreferences.accentColor ||
            user.preferences.editorFontSize !==
                updatedPreferences.editorFontSize ||
            user.preferences.editorFontFamily !==
                updatedPreferences.editorFontFamily ||
            user.preferences.defaultImageAiModel !==
                updatedPreferences.defaultImageAiModel ||
            user.preferences.geminiApiKey !== updatedPreferences.geminiApiKey;

        if (hasChanges) {
            user.preferences = updatedPreferences;
            user.updatedAt = new Date();
            await this.userRepository.update(user);

            const storedUser = await this.sessionStore.load();
            if (storedUser?.id === user.id) {
                await this.sessionStore.save(user);
            }
        }

        if (Object.keys(localPreferencesPatch).length > 0) {
            await this.sessionStore.saveLocalPreferences(localPreferencesPatch);
        }
    }
}
