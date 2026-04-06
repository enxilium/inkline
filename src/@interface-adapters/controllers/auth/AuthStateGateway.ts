import type { User } from "../../../@core/domain/entities/user/User";
import type { ThemePreference } from "../../../@core/domain/entities/user/UserPreferences";
import { GUEST_USER_ID } from "../../../@core/domain/constants/GuestUserConstants";

export const AUTH_STATE_CHANGED_CHANNEL = "auth:stateChanged";

export type SerializableUser = {
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
    };
};

export type AuthStatePayload = {
    user: SerializableUser | null;
    currentUserId: string;
    isAuthenticated: boolean;
    isGuest: boolean;
    migrationInProgress: boolean;
};

export type SetAuthStateOptions = {
    currentUserId?: string;
    migrationInProgress?: boolean;
};

export interface AuthStateGateway {
    setUser(user: User | null, options?: SetAuthStateOptions): void;
    setMigrationInProgress(value: boolean): void;
    getSnapshot(): AuthStatePayload;
}

export const createGuestSnapshot = (
    options?: SetAuthStateOptions,
): AuthStatePayload => ({
    user: null,
    currentUserId: options?.currentUserId?.trim() || GUEST_USER_ID,
    isAuthenticated: false,
    isGuest: true,
    migrationInProgress: options?.migrationInProgress ?? false,
});

export const mapUserToSerializable = (user: User): SerializableUser => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    authProvider: user.authProvider,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    projectIds: [...user.projectIds],
    preferences: {
        theme: user.preferences.theme,
        accentColor: user.preferences.accentColor,
        editorFontSize: user.preferences.editorFontSize,
        editorFontFamily: user.preferences.editorFontFamily,
        defaultImageAiModel: user.preferences.defaultImageAiModel,
    },
});
