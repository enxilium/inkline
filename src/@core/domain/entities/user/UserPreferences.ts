export type ThemePreference = "light" | "dark" | "system";

/**
 * Preferences controlling how the author experiences the editor.
 */
export class UserPreferences {
    constructor(
        public theme: ThemePreference,
        public editorFontSize: number,
        public editorFontFamily: string,
        public defaultImageAiModel: string,
        public geminiApiKey?: string
    ) {}
}
