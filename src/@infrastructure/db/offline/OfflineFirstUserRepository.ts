import { User } from "../../../@core/domain/entities/user/User";
import { IUserRepository } from "../../../@core/domain/repositories/IUserRepository";
import { isGuestUserId } from "../../../@core/domain/constants/GuestUserConstants";
import { SupabaseUserRepository } from "../SupabaseUserRepository";
import { FileSystemUserRepository } from "../filesystem/FileSystemUserRepository";

export class OfflineFirstUserRepository implements IUserRepository {
    constructor(
        private readonly supabaseRepo: SupabaseUserRepository,
        private readonly fsRepo: FileSystemUserRepository,
    ) {}

    async create(user: User): Promise<void> {
        if (isGuestUserId(user.id)) {
            await this.fsRepo.create(user);
            return;
        }

        let fsError: unknown = null;
        try {
            await this.fsRepo.create(user);
        } catch (error) {
            fsError = error;
        }

        try {
            await this.supabaseRepo.create(user);
        } catch (error) {
            if (fsError) {
                throw error;
            }
            console.warn(
                "Failed to create user in Supabase; local copy persisted.",
                error,
            );
        }
    }

    async findById(id: string): Promise<User | null> {
        if (isGuestUserId(id)) {
            return this.fsRepo.findById(id);
        }

        let remote: User | null = null;
        try {
            remote = await this.supabaseRepo.findById(id);
        } catch {
            // Offline or cloud unavailable
        }

        const local = await this.fsRepo.findById(id);

        if (remote && local) {
            const merged = this.mergeCloudFirst(remote, local);
            await this.fsRepo.update(merged);
            return merged;
        }

        if (remote && !local) {
            await this.fsRepo.create(remote);
            return remote;
        }

        return local;
    }

    async update(user: User): Promise<void> {
        if (isGuestUserId(user.id)) {
            await this.fsRepo.update(user);
            return;
        }

        let fsError: unknown = null;
        try {
            await this.fsRepo.update(user);
        } catch (error) {
            fsError = error;
        }

        try {
            await this.supabaseRepo.update(user);
        } catch (error) {
            if (fsError) {
                throw error;
            }
            console.warn(
                "Failed to update user in Supabase; local copy persisted.",
                error,
            );
        }
    }

    async delete(id: string): Promise<void> {
        if (isGuestUserId(id)) {
            await this.fsRepo.delete(id);
            return;
        }

        await Promise.allSettled([
            this.supabaseRepo.delete(id),
            this.fsRepo.delete(id),
        ]);
    }

    private mergeCloudFirst(remote: User, local: User): User {
        const merged = remote;

        merged.projectIds =
            remote.projectIds.length > 0
                ? [...remote.projectIds]
                : [...local.projectIds];

        merged.preferences.theme =
            remote.preferences.theme || local.preferences.theme;
        merged.preferences.accentColor = this.isValidHex(
            remote.preferences.accentColor,
        )
            ? remote.preferences.accentColor
            : local.preferences.accentColor;
        merged.preferences.editorFontSize =
            remote.preferences.editorFontSize > 0
                ? remote.preferences.editorFontSize
                : local.preferences.editorFontSize;
        merged.preferences.editorFontFamily =
            remote.preferences.editorFontFamily.trim().length > 0
                ? remote.preferences.editorFontFamily
                : local.preferences.editorFontFamily;
        merged.preferences.defaultImageAiModel =
            remote.preferences.defaultImageAiModel.trim().length > 0
                ? remote.preferences.defaultImageAiModel
                : local.preferences.defaultImageAiModel;
        merged.preferences.geminiApiKey =
            remote.preferences.geminiApiKey?.trim().length
                ? remote.preferences.geminiApiKey
                : local.preferences.geminiApiKey;

        return merged;
    }

    private isValidHex(color: string): boolean {
        return /^#[0-9a-fA-F]{6}$/.test(color);
    }
}
