import type { PostgrestError } from "@supabase/supabase-js";

import { IUserRepository } from "../../@core/domain/repositories/IUserRepository";
import { User } from "../../@core/domain/entities/user/User";
import {
    UserPreferences,
    ThemePreference,
} from "../../@core/domain/entities/user/UserPreferences";
import { SupabaseService } from "./SupabaseService";

type UserRow = {
    id: string;
    email: string;
    display_name: string | null;
    auth_provider: string | null;
    preferences: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
    last_login_at: string | null;
};

export class SupabaseUserRepository implements IUserRepository {
    async create(user: User): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("users").insert({
            id: user.id,
            email: user.email,
            display_name: user.displayName,
            auth_provider: user.authProvider,
            preferences: this.serializePreferences(user.preferences),
            created_at: user.createdAt.toISOString(),
            updated_at: user.updatedAt.toISOString(),
            last_login_at: user.lastLoginAt
                ? user.lastLoginAt.toISOString()
                : null,
        });

        if (error) {
            const code = (error as PostgrestError).code;
            if (code === "23505") {
                await this.update(user);
                return;
            }

            throw new Error(error.message);
        }
    }

    async findById(id: string): Promise<User | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("users")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return null;

        const row = data as UserRow;
        const projectIds = await this.fetchProjectIds(row.id);
        return this.mapToUser(row, projectIds);
    }

    async update(user: User): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("users")
            .update({
                display_name: user.displayName,
                preferences: this.serializePreferences(user.preferences),
                updated_at: user.updatedAt.toISOString(),
                last_login_at: user.lastLoginAt
                    ? user.lastLoginAt.toISOString()
                    : null,
            })
            .eq("id", user.id);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("users").delete().eq("id", id);
        if (error) throw new Error(error.message);
    }

    private mapToUser(data: UserRow, projectIds: string[]): User {
        const prefs = (data.preferences || {}) as Record<string, unknown>;

        const coerceTheme = (value: unknown): ThemePreference => {
            const allowed: ThemePreference[] = ["light", "dark", "system"];
            return typeof value === "string" &&
                allowed.includes(value as ThemePreference)
                ? (value as ThemePreference)
                : "system";
        };

        const coerceNumber = (value: unknown, fallback: number): number =>
            typeof value === "number" ? value : fallback;
        const coerceString = (value: unknown, fallback: string): string =>
            typeof value === "string" && value.trim().length > 0
                ? value
                : fallback;
        const coerceHexColor = (value: unknown, fallback: string): string =>
            typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
                ? value
                : fallback;

        const userPreferences = new UserPreferences(
            coerceTheme(prefs.theme),
            coerceHexColor(prefs.accentColor, "#2ef6ad"),
            coerceNumber(prefs.editorFontSize, 16),
            coerceString(prefs.editorFontFamily, "sans-serif"),
            coerceString(prefs.defaultImageAiModel, "flux"),
            typeof prefs.geminiApiKey === "string"
                ? prefs.geminiApiKey
                : undefined,
        );

        return new User(
            data.id,
            data.email,
            data.display_name || "",
            data.auth_provider || "email",
            new Date(data.created_at),
            new Date(data.updated_at),
            data.last_login_at ? new Date(data.last_login_at) : null,
            [...projectIds],
            userPreferences,
        );
    }

    private async fetchProjectIds(userId: string): Promise<string[]> {
        const client = SupabaseService.getClient();
        const pageSize = 500;
        const ids: string[] = [];
        let offset = 0;

        while (true) {
            const { data, error } = await client
                .from("projects")
                .select("id")
                .eq("user_id", userId)
                .order("id", { ascending: true })
                .range(offset, offset + pageSize - 1);

            if (error) {
                throw new Error(error.message);
            }

            const batch = (data as Array<{ id: string }> | null) ?? [];
            ids.push(...batch.map((row) => row.id));

            if (batch.length < pageSize) {
                break;
            }

            offset += pageSize;
        }

        return ids;
    }

    private serializePreferences(
        preferences: UserPreferences,
    ): Record<string, unknown> {
        return {
            theme: preferences.theme,
            accentColor: preferences.accentColor,
            editorFontSize: preferences.editorFontSize,
            editorFontFamily: preferences.editorFontFamily,
            defaultImageAiModel: preferences.defaultImageAiModel,
            geminiApiKey: preferences.geminiApiKey,
        };
    }
}
