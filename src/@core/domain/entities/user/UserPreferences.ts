export type ThemePreference = "light" | "dark" | "system";

/**
 * Feature flags for enabling/disabling AI generation features.
 */
export interface FeatureFlags {
    aiChatEnabled: boolean;
    imageGenerationEnabled: boolean;
    audioGenerationEnabled: boolean;
}

/**
 * Preferences controlling how the author experiences the editor.
 */
export class UserPreferences {
    constructor(
        public theme: ThemePreference,
        public editorFontSize: number,
        public editorFontFamily: string,
        public defaultImageAiModel: string,
        public geminiApiKey?: string,
        public features: FeatureFlags = {
            aiChatEnabled: true,
            imageGenerationEnabled: false,
            audioGenerationEnabled: false,
        }
    ) {}
}
