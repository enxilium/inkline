import { User } from "../../../domain/entities/user/User";
import { UserPreferences } from "../../../domain/entities/user/UserPreferences";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IAuthService } from "../../../domain/services/IAuthService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface LoginUserRequest {
    email: string;
    password: string;
}

export interface LoginUserResponse {
    user: User;
}

export class LoginUser {
    constructor(
        private readonly authService: IAuthService,
        private readonly userRepository: IUserRepository,
        private readonly sessionStore: IUserSessionStore,
    ) {}

    async execute(request: LoginUserRequest): Promise<LoginUserResponse> {
        const email = request.email.trim().toLowerCase();
        const password = request.password;

        if (!email) {
            throw new Error("Email is required to login.");
        }

        if (!password) {
            throw new Error("Password is required to login.");
        }

        const authUser = await this.authService.login(email, password);
        const existingUser = await this.userRepository.findById(authUser.id);
        const localPreferences = await this.sessionStore.loadLocalPreferences();

        const user = this.mergeAuthenticatedUser(
            authUser,
            existingUser,
            localPreferences.geminiApiKey,
        );

        if (existingUser) {
            await this.userRepository.update(user);
        } else {
            await this.userRepository.create(user);
        }

        await this.sessionStore.save(user);

        return { user };
    }

    private mergeAuthenticatedUser(
        authUser: User,
        existingUser: User | null,
        guestApiKey?: string,
    ): User {
        const now = new Date();
        const source = existingUser ?? authUser;
        const sourcePreferences = source.preferences;

        const normalizedExistingApiKey =
            sourcePreferences.geminiApiKey?.trim() || undefined;
        const normalizedGuestApiKey = guestApiKey?.trim() || undefined;
        const resolvedApiKey =
            normalizedExistingApiKey ?? normalizedGuestApiKey;

        const mergedPreferences = new UserPreferences(
            sourcePreferences.theme,
            sourcePreferences.accentColor,
            sourcePreferences.editorFontSize,
            sourcePreferences.editorFontFamily,
            sourcePreferences.defaultImageAiModel,
            resolvedApiKey,
        );

        return new User(
            authUser.id,
            authUser.email || source.email,
            source.displayName,
            authUser.authProvider || source.authProvider,
            source.createdAt,
            now,
            now,
            [...source.projectIds],
            mergedPreferences,
        );
    }
}
