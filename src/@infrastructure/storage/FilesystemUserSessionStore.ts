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
    };
};

type SessionFileSchema = {
    user: StoredUserPayload;
};

export class FilesystemUserSessionStore implements IUserSessionStore {
    private static SESSION_FILENAME = "user-session.json";

    async load(): Promise<User | null> {
        try {
            const filePath = await this.resolveSessionFilePath();
            const raw = await fs.readFile(filePath, "utf-8");
            const parsed = JSON.parse(raw) as SessionFileSchema;
            return this.deserialize(parsed.user);
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
    }

    async clear(): Promise<void> {
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
            },
        };
    }

    private deserialize(payload: StoredUserPayload): User {
        const preferences = new UserPreferences(
            payload.preferences.theme,
            payload.preferences.editorFontSize,
            payload.preferences.editorFontFamily,
            payload.preferences.defaultImageAiModel
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
