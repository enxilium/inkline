import { promises as fs } from "fs";
import path from "path";
import { app } from "electron";
import { IUserSessionStore } from "../../@core/domain/services/IUserSessionStore";
import { User } from "../../@core/domain/entities/user/User";
import {
    UserPreferences,
    ThemePreference,
} from "../../@core/domain/entities/user/UserPreferences";

type StoredUserPayload = {
    id: string;
    email: string;
    displayName: string;
    authProvider: string;
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string | null;
    projectIds: string[];
    preferences: {
        theme: ThemePreference;
        editorFontSize: number;
        editorFontFamily: string;
        defaultImageAiModel: string;
        geminiApiKey?: string;
    };
};

type SessionFileSchema = {
    user: StoredUserPayload;
};

/**
 * Schema for device-local preferences that persist across logouts.
 * These settings are device-specific and should NOT be cleared on logout.
 */
type LocalPreferencesSchema = {
    geminiApiKey?: string;
};

export class FilesystemUserSessionStore implements IUserSessionStore {
    private static SESSION_FILENAME = "user-session.json";
    private static LOCAL_PREFS_FILENAME = "local-preferences.json";

    async load(): Promise<User | null> {
        try {
            const filePath = await this.resolveSessionFilePath();
            const raw = await fs.readFile(filePath, "utf-8");
            const parsed = JSON.parse(raw) as SessionFileSchema;
            const user = this.deserialize(parsed.user);
            
            // Merge device-local preferences (like API key) that persist across logouts
            const localPrefs = await this.loadLocalPreferences();
            if (localPrefs.geminiApiKey && !user.preferences.geminiApiKey) {
                user.preferences = new UserPreferences(
                    user.preferences.theme,
                    user.preferences.editorFontSize,
                    user.preferences.editorFontFamily,
                    user.preferences.defaultImageAiModel,
                    localPrefs.geminiApiKey
                );
            }
            
            return user;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return null;
            }

            throw error;
        }
    }

    async save(user: User): Promise<void> {
        const filePath = await this.resolveSessionFilePath();
        const directory = path.dirname(filePath);
        await fs.mkdir(directory, { recursive: true });

        const payload: SessionFileSchema = {
            user: this.serialize(user),
        };

        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), {
            encoding: "utf-8",
        });
        
        // Also persist device-local preferences so they survive logout
        if (user.preferences.geminiApiKey) {
            await this.saveLocalPreferences({ 
                geminiApiKey: user.preferences.geminiApiKey 
            });
        }
    }

    async clear(): Promise<void> {
        // Only clear the session file, NOT the local preferences
        // This preserves API keys across logouts
        try {
            const filePath = await this.resolveSessionFilePath();
            await fs.unlink(filePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return;
            }

            throw error;
        }
    }

    private async resolveSessionFilePath(): Promise<string> {
        if (!app.isReady()) {
            await app.whenReady();
        }

        const userDataPath = app.getPath("userData");
        return path.join(
            userDataPath,
            FilesystemUserSessionStore.SESSION_FILENAME
        );
    }
    
    private async resolveLocalPrefsFilePath(): Promise<string> {
        if (!app.isReady()) {
            await app.whenReady();
        }

        const userDataPath = app.getPath("userData");
        return path.join(
            userDataPath,
            FilesystemUserSessionStore.LOCAL_PREFS_FILENAME
        );
    }
    
    private async loadLocalPreferences(): Promise<LocalPreferencesSchema> {
        try {
            const filePath = await this.resolveLocalPrefsFilePath();
            const raw = await fs.readFile(filePath, "utf-8");
            return JSON.parse(raw) as LocalPreferencesSchema;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return {};
            }
            console.warn("Failed to load local preferences:", error);
            return {};
        }
    }
    
    private async saveLocalPreferences(prefs: LocalPreferencesSchema): Promise<void> {
        try {
            const filePath = await this.resolveLocalPrefsFilePath();
            const directory = path.dirname(filePath);
            await fs.mkdir(directory, { recursive: true });
            
            // Merge with existing preferences
            const existing = await this.loadLocalPreferences();
            const merged = { ...existing, ...prefs };
            
            await fs.writeFile(filePath, JSON.stringify(merged, null, 2), {
                encoding: "utf-8",
            });
        } catch (error) {
            console.warn("Failed to save local preferences:", error);
        }
    }

    private serialize(user: User): StoredUserPayload {
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            authProvider: user.authProvider,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
            lastLoginAt: user.lastLoginAt
                ? user.lastLoginAt.toISOString()
                : null,
            projectIds: [...user.projectIds],
            preferences: {
                theme: user.preferences.theme,
                editorFontSize: user.preferences.editorFontSize,
                editorFontFamily: user.preferences.editorFontFamily,
                defaultImageAiModel: user.preferences.defaultImageAiModel,
                geminiApiKey: user.preferences.geminiApiKey,
            },
        };
    }

    private deserialize(payload: StoredUserPayload): User {
        const preferences = new UserPreferences(
            payload.preferences.theme,
            payload.preferences.editorFontSize,
            payload.preferences.editorFontFamily,
            payload.preferences.defaultImageAiModel,
            payload.preferences.geminiApiKey
        );

        return new User(
            payload.id,
            payload.email,
            payload.displayName,
            payload.authProvider,
            new Date(payload.createdAt),
            new Date(payload.updatedAt),
            payload.lastLoginAt ? new Date(payload.lastLoginAt) : null,
            [...payload.projectIds],
            preferences
        );
    }
}
