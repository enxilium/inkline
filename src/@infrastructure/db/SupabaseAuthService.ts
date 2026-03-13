import { IAuthService } from "../../@core/domain/services/IAuthService";
import { User } from "../../@core/domain/entities/user/User";
import { UserPreferences } from "../../@core/domain/entities/user/UserPreferences";
import { SupabaseService } from "./SupabaseService";

export class SupabaseAuthService implements IAuthService {
    private mapAuthErrorMessage(errorMessage: string, action: string): string {
        const normalized = errorMessage.toLowerCase();

        if (
            normalized.includes("invalid login credentials") ||
            normalized.includes("invalid password")
        ) {
            return "We couldn't sign you in. Check your email and password, or reset your password.";
        }

        if (
            normalized.includes("already registered") ||
            normalized.includes("already in use")
        ) {
            return "That email is already registered. Sign in instead, or reset your password.";
        }

        if (normalized.includes("at least 6")) {
            return "Choose a stronger password with at least 6 characters.";
        }

        if (normalized.includes("network") || normalized.includes("timeout")) {
            return "Connection issue detected. Please check your internet and try again.";
        }

        if (action === "reset-password") {
            return "Unable to send reset instructions right now. Please verify the email and try again.";
        }

        return errorMessage;
    }

    async login(email: string, password: string): Promise<User> {
        const client = SupabaseService.getClient();
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            throw new Error(this.mapAuthErrorMessage(error.message, "login"));
        }
        if (!data.user) throw new Error("Login failed: No user returned.");

        return this.mapSupabaseUserToDomainUser(data.user);
    }

    async register(email: string, password: string): Promise<User> {
        const client = SupabaseService.getClient();
        const { data, error } = await client.auth.signUp({
            email,
            password,
        });

        if (error) {
            throw new Error(
                this.mapAuthErrorMessage(error.message, "register"),
            );
        }
        if (!data.user)
            throw new Error("Registration failed: No user returned.");

        return this.mapSupabaseUserToDomainUser(data.user);
    }

    async logout(): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.auth.signOut();
        if (error) throw new Error(error.message);
    }

    async getCurrentUser(): Promise<User | null> {
        const client = SupabaseService.getClient();
        const {
            data: { session },
            error,
        } = await client.auth.getSession();

        if (error || !session?.user) return null;

        return this.mapSupabaseUserToDomainUser(session.user);
    }

    async resetPassword(email: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.auth.resetPasswordForEmail(email);
        if (error) {
            throw new Error(
                this.mapAuthErrorMessage(error.message, "reset-password"),
            );
        }
    }

    async updateEmail(newEmail: string): Promise<User> {
        const client = SupabaseService.getClient();
        const { data, error } = await client.auth.updateUser({
            email: newEmail,
        });

        if (error) {
            throw new Error(
                this.mapAuthErrorMessage(error.message, "update-email"),
            );
        }
        if (!data.user)
            throw new Error("Email update failed: No user returned.");

        return this.mapSupabaseUserToDomainUser(data.user);
    }

    async updatePassword(newPassword: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            throw new Error(
                this.mapAuthErrorMessage(error.message, "update-password"),
            );
        }
    }

    async deleteAccount(): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.rpc("delete_own_account");
        if (error) throw new Error(error.message);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private mapSupabaseUserToDomainUser(supabaseUser: any): User {
        // Default preferences for a new/auth-only user instance
        const defaultPreferences = new UserPreferences(
            "system",
            "#2ef6ad",
            16,
            "sans-serif",
            "flux",
        );

        return new User(
            supabaseUser.id,
            supabaseUser.email || "",
            supabaseUser.user_metadata?.full_name || "",
            supabaseUser.app_metadata?.provider || "email",
            new Date(supabaseUser.created_at),
            new Date(supabaseUser.updated_at || new Date()),
            supabaseUser.last_sign_in_at
                ? new Date(supabaseUser.last_sign_in_at)
                : null,
            [], // Project IDs are not available from Auth object
            defaultPreferences,
        );
    }
}
