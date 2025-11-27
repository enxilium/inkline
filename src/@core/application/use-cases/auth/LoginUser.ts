import { User } from "../../../domain/entities/user/User";
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
        private readonly sessionStore: IUserSessionStore
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

        const user = await this.authService.login(email, password);
        user.lastLoginAt = new Date();
        user.updatedAt = new Date();

        const existingUser = await this.userRepository.findById(user.id);
        if (existingUser) {
            await this.userRepository.update(user);
        } else {
            await this.userRepository.create(user);
        }

        await this.sessionStore.save(user);

        return { user };
    }
}
