import { UserPreferences } from "../../../domain/entities/user/UserPreferences";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface SaveUserSettingsRequest {
    userId: string;
    preferences: Partial<UserPreferences>;
}

export class SaveUserSettings {
    constructor(
        private readonly userRepository: IUserRepository,
        private readonly sessionStore: IUserSessionStore
    ) {}

    async execute(request: SaveUserSettingsRequest): Promise<void> {
        const { userId, preferences } = request;

        if (!userId.trim()) {
            throw new Error("User ID is required.");
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error("User not found.");
        }

        const updatedPreferences = new UserPreferences(
            preferences.theme ?? user.preferences.theme,
            preferences.editorFontSize ?? user.preferences.editorFontSize,
            preferences.editorFontFamily ?? user.preferences.editorFontFamily,
            preferences.defaultImageAiModel ??
                user.preferences.defaultImageAiModel,
            preferences.geminiApiKey ?? user.preferences.geminiApiKey
        );

        if (
            preferences.editorFontSize !== undefined &&
            preferences.editorFontSize <= 0
        ) {
            throw new Error("Editor font size must be greater than zero.");
        }

        user.preferences = updatedPreferences;
        user.updatedAt = new Date();
        await this.userRepository.update(user);

        const storedUser = await this.sessionStore.load();
        if (storedUser?.id === user.id) {
            await this.sessionStore.save(user);
        }
    }
}
