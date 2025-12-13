import { IAuthService } from "../../@core/domain/services/IAuthService";
import { User } from "../../@core/domain/entities/user/User";
import { UserPreferences } from "../../@core/domain/entities/user/UserPreferences";
import { SupabaseService } from "./SupabaseService";

export class SupabaseAuthService implements IAuthService {
    async login(email: string, password: string): Promise<User> {
        const client = SupabaseService.getClient();
        const { data, error } = await client.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw new Error(error.message);
        if (!data.user) throw new Error("Login failed: No user returned.");

        return this.mapSupabaseUserToDomainUser(data.user);
    }

    async register(email: string, password: string): Promise<User> {
        const client = SupabaseService.getClient();
        const { data, error } = await client.auth.signUp({
            email,
            password,
        });

        if (error) throw new Error(error.message);
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
        if (error) throw new Error(error.message);
    }

    async updateEmail(newEmail: string): Promise<User> {
        const client = SupabaseService.getClient();
        const { data, error } = await client.auth.updateUser({
            email: newEmail,
        });

        if (error) throw new Error(error.message);
        if (!data.user)
            throw new Error("Email update failed: No user returned.");

        return this.mapSupabaseUserToDomainUser(data.user);
    }

    async updatePassword(newPassword: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.auth.updateUser({
            password: newPassword,
        });

        if (error) throw new Error(error.message);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private mapSupabaseUserToDomainUser(supabaseUser: any): User {
        // Default preferences for a new/auth-only user instance
        const defaultPreferences = new UserPreferences(
            "system",
            16,
            "sans-serif",
            "flux"
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
            defaultPreferences
        );
    }
}
