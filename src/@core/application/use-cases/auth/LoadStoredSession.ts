import { User } from "../../../domain/entities/user/User";
import { IAuthService } from "../../../domain/services/IAuthService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface LoadStoredSessionResponse {
    user: User | null;
}

export class LoadStoredSession {
    constructor(
        private readonly sessionStore: IUserSessionStore,
        private readonly authService: IAuthService
    ) {}

    async execute(): Promise<LoadStoredSessionResponse> {
        const storedUser = await this.sessionStore.load();

        // If no user is stored locally, we are definitely not logged in.
        if (!storedUser) {
            return { user: null };
        }

        // Verify with the auth service (Supabase) to ensure the session token is valid.
        const authUser = await this.authService.getCurrentUser();

        if (!authUser) {
            // Token expired or invalid. Clear local store to sync state.
            await this.sessionStore.clear();
            return { user: null };
        }

        // Optional: Update local store if auth service has fresher data?
        // For now, we trust the auth service's validity check.
        // We return the stored user because it might have more app-specific data
        // (like preferences) that the auth service (just identity) might not fully hydrate
        // if not implemented to do so.
        // However, SupabaseAuthService.getCurrentUser() seems to map from Supabase user,
        // which might lack some custom fields if not careful.
        // But wait, SupabaseUserRepository is what fetches the full profile.
        // SupabaseAuthService.getCurrentUser() maps from session.user.

        // Let's look at SupabaseAuthService.getCurrentUser again.
        // It returns a User object but with default preferences and empty project IDs.
        // The storedUser has the full profile.

        // So we should return storedUser, BUT only if authUser exists.
        // Ideally, we should refresh the profile from the repository too, but that might be overkill for startup check.
        // Let's stick to: if authUser exists, return storedUser.

        return { user: storedUser };
    }
}
