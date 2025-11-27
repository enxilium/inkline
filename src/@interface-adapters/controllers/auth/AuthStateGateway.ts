import type { User } from "../../../@core/domain/entities/user/User";
import type { ThemePreference } from "../../../@core/domain/entities/user/UserPreferences";

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
        editorFontSize: number;
        editorFontFamily: string;
        defaultImageAiModel: string;
    };
};

export type AuthStatePayload = {
    user: SerializableUser | null;
};

export interface AuthStateGateway {
    setUser(user: User | null): void;
    getSnapshot(): AuthStatePayload;
}

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
        editorFontSize: user.preferences.editorFontSize,
        editorFontFamily: user.preferences.editorFontFamily,
        defaultImageAiModel: user.preferences.defaultImageAiModel,
    },
});
