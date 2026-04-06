import { promises as fs } from "fs";
import path from "path";
import { app } from "electron";
import {
    IUserSessionStore,
    LocalSessionPreferences,
} from "../../@core/domain/services/IUserSessionStore";
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
        accentColor: string;
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
type LocalPreferencesSchema = LocalSessionPreferences;

export class FilesystemUserSessionStore implements IUserSessionStore {
    private static SESSION_FILENAME = "user-session.json";
    private static LOCAL_PREFS_FILENAME = "local-preferences.json";

    private operationQueue: Promise<unknown> = Promise.resolve();

    private enqueue<T>(operation: () => Promise<T>): Promise<T> {
        const nextPromise = this.operationQueue.then(operation);
        this.operationQueue = nextPromise.catch((): void => {
            /* noop */
        });
        return nextPromise;
    }

    async load(): Promise<User | null> {
        return this.enqueue(async () => {
            try {
                const filePath = await this.resolveSessionFilePath();
                const raw = await fs.readFile(filePath, "utf-8");

                try {
                    const parsed = JSON.parse(raw) as SessionFileSchema;
                    const user = this.deserialize(parsed.user);

                    // Merge device-local preferences (like API key) that persist across logouts
                    const localPrefs =
                        await this.loadLocalPreferencesInternal();
                    if (
                        localPrefs.geminiApiKey &&
                        !user.preferences.geminiApiKey
                    ) {
                        user.preferences = new UserPreferences(
                            user.preferences.theme,
                            user.preferences.accentColor,
                            user.preferences.editorFontSize,
                            user.preferences.editorFontFamily,
                            user.preferences.defaultImageAiModel,
                            localPrefs.geminiApiKey,
                        );
                    }

                    return user;
                } catch (parseError) {
                    console.warn(
                        "[SessionStore] JSON Parse Error. Raw content was:",
                        JSON.stringify(raw),
                    );
                    throw parseError; // Caught by outer catch
                }
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                    return null;
                }

                console.warn("Failed to load user session:", error);
                return null;
            }
        });
    }

    async loadLocalPreferences(): Promise<LocalSessionPreferences> {
        return this.enqueue(async () => {
            return this.loadLocalPreferencesInternal();
        });
    }

    async saveLocalPreferences(
        preferences: LocalSessionPreferences,
    ): Promise<void> {
        return this.enqueue(async () => {
            await this.saveLocalPreferencesInternal(preferences);
        });
    }

    async save(user: User): Promise<void> {
        return this.enqueue(async () => {
            const filePath = await this.resolveSessionFilePath();
            const directory = path.dirname(filePath);
            await fs.mkdir(directory, { recursive: true });

            const payload: SessionFileSchema = {
                user: this.serialize(user),
            };

            const jsonString = JSON.stringify(payload, null, 2);
            await fs.writeFile(filePath, jsonString, {
                encoding: "utf-8",
            });

            // Also persist device-local preferences so they survive logout
            await this.saveLocalPreferencesInternal(
                {
                    theme: user.preferences.theme,
                    accentColor: user.preferences.accentColor,
                    editorFontSize: user.preferences.editorFontSize,
                    editorFontFamily: user.preferences.editorFontFamily,
                    defaultImageAiModel: user.preferences.defaultImageAiModel,
                    geminiApiKey: user.preferences.geminiApiKey,
                },
                { replace: true },
            );
        });
    }

    async clear(): Promise<void> {
        return this.enqueue(async () => {
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
        });
    }

    private async resolveSessionFilePath(): Promise<string> {
        if (!app.isReady()) {
            await app.whenReady();
        }

        const userDataPath = app.getPath("userData");
        return path.join(
            userDataPath,
            FilesystemUserSessionStore.SESSION_FILENAME,
        );
    }

    private async resolveLocalPrefsFilePath(): Promise<string> {
        if (!app.isReady()) {
            await app.whenReady();
        }

        const userDataPath = app.getPath("userData");
        return path.join(
            userDataPath,
            FilesystemUserSessionStore.LOCAL_PREFS_FILENAME,
        );
    }

    private async loadLocalPreferencesInternal(): Promise<LocalPreferencesSchema> {
        try {
            const filePath = await this.resolveLocalPrefsFilePath();
            const raw = await fs.readFile(filePath, "utf-8");
            try {
                const parsed = JSON.parse(raw) as LocalPreferencesSchema;
                return parsed;
            } catch (parseError) {
                console.warn(
                    "[SessionStore] Local Prefs JSON Parse Error. Raw content was:",
                    JSON.stringify(raw),
                );
                throw parseError; // Caught by outer catch
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return {};
            }
            console.warn("Failed to load local preferences:", error);
            return {};
        }
    }

    private async saveLocalPreferencesInternal(
        prefs: LocalPreferencesSchema,
        options?: { replace?: boolean },
    ): Promise<void> {
        try {
            const filePath = await this.resolveLocalPrefsFilePath();
            const directory = path.dirname(filePath);
            await fs.mkdir(directory, { recursive: true });

            const existing = options?.replace
                ? {}
                : await this.loadLocalPreferencesInternal();
            const merged = this.pruneUndefined({
                ...existing,
                ...prefs,
            });

            await fs.writeFile(filePath, JSON.stringify(merged, null, 2), {
                encoding: "utf-8",
            });
        } catch (error) {
            console.warn("Failed to save local preferences:", error);
        }
    }

    private pruneUndefined<T extends Record<string, unknown>>(
        value: T,
    ): Partial<T> {
        return Object.fromEntries(
            Object.entries(value).filter(([, entry]) => entry !== undefined),
        ) as Partial<T>;
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
                accentColor: user.preferences.accentColor,
                editorFontSize: user.preferences.editorFontSize,
                editorFontFamily: user.preferences.editorFontFamily,
                defaultImageAiModel: user.preferences.defaultImageAiModel,
                geminiApiKey: user.preferences.geminiApiKey,
            },
        };
    }

    private deserialize(payload: StoredUserPayload): User {
        const accentColor =
            typeof payload.preferences.accentColor === "string" &&
            /^#[0-9a-fA-F]{6}$/.test(payload.preferences.accentColor)
                ? payload.preferences.accentColor
                : "#2ef6ad";

        const preferences = new UserPreferences(
            payload.preferences.theme,
            accentColor,
            payload.preferences.editorFontSize,
            payload.preferences.editorFontFamily,
            payload.preferences.defaultImageAiModel,
            payload.preferences.geminiApiKey,
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
            preferences,
        );
    }
}
