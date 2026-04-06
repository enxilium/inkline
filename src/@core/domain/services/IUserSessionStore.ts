import { User } from "../entities/user/User";
import type { ThemePreference } from "../entities/user/UserPreferences";

export interface LocalSessionPreferences {
    theme?: ThemePreference;
    accentColor?: string;
    editorFontSize?: number;
    editorFontFamily?: string;
    defaultImageAiModel?: string;
    geminiApiKey?: string;
}

/**
 * IUserSessionStore persists the authenticated user locally so that
 * subsequent launches can resume without prompting for credentials.
 */
export interface IUserSessionStore {
    load(): Promise<User | null>;
    save(user: User): Promise<void>;
    clear(): Promise<void>;
    loadLocalPreferences(): Promise<LocalSessionPreferences>;
    saveLocalPreferences(preferences: LocalSessionPreferences): Promise<void>;
}
