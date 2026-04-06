import { IUserRepository } from "../../../@core/domain/repositories/IUserRepository";
import { User } from "../../../@core/domain/entities/user/User";
import {
    UserPreferences,
    ThemePreference,
} from "../../../@core/domain/entities/user/UserPreferences";
import {
    GUEST_DISPLAY_NAME,
    GUEST_EMAIL,
    GUEST_USER_ID,
    isGuestUserId,
} from "../../../@core/domain/constants/GuestUserConstants";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemUser = {
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

export class FileSystemUserRepository implements IUserRepository {
    private getFilePath(userId: string): string {
        return path.join("users", userId, "profile.json");
    }

    async create(user: User): Promise<void> {
        await fileSystemService.writeJson(
            this.getFilePath(user.id),
            this.toDto(user),
        );
    }

    async findById(id: string): Promise<User | null> {
        const dto = await fileSystemService.readJson<FileSystemUser>(
            this.getFilePath(id),
        );

        if (dto) {
            return this.toEntity(dto);
        }

        if (isGuestUserId(id)) {
            return this.createDefaultGuestUser();
        }

        return null;
    }

    async update(user: User): Promise<void> {
        await fileSystemService.writeJson(
            this.getFilePath(user.id),
            this.toDto(user),
        );
    }

    async delete(id: string): Promise<void> {
        await fileSystemService.deleteFile(this.getFilePath(id));
    }

    private createDefaultGuestUser(): User {
        const now = new Date();
        return new User(
            GUEST_USER_ID,
            GUEST_EMAIL,
            GUEST_DISPLAY_NAME,
            "guest",
            now,
            now,
            null,
            [],
            new UserPreferences("system", "#2ef6ad", 16, "sans-serif", "flux"),
        );
    }

    private toDto(user: User): FileSystemUser {
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

    private toEntity(dto: FileSystemUser): User {
        return new User(
            dto.id,
            dto.email,
            dto.displayName,
            dto.authProvider,
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
            dto.lastLoginAt ? new Date(dto.lastLoginAt) : null,
            [...dto.projectIds],
            new UserPreferences(
                dto.preferences.theme,
                dto.preferences.accentColor,
                dto.preferences.editorFontSize,
                dto.preferences.editorFontFamily,
                dto.preferences.defaultImageAiModel,
                dto.preferences.geminiApiKey,
            ),
        );
    }
}
