import { User } from "../../../domain/entities/user/User";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IAuthService } from "../../../domain/services/IAuthService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface UpdateUserPasswordRequest {
    newPassword: string;
}

export interface UpdateUserPasswordResponse {
    user: User;
}

export class UpdateUserPassword {
    constructor(
        private readonly authService: IAuthService,
        private readonly userRepository: IUserRepository,
        private readonly sessionStore: IUserSessionStore
    ) {}

    async execute(
        request: UpdateUserPasswordRequest
    ): Promise<UpdateUserPasswordResponse> {
        const newPassword = request.newPassword;

        if (!newPassword) {
            throw new Error("Password is required.");
        }

        const storedUser = await this.sessionStore.load();
        if (!storedUser) {
            throw new Error("You must be signed in to update your password.");
        }

        await this.authService.updatePassword(newPassword);

        storedUser.updatedAt = new Date();
        await this.userRepository.update(storedUser);
        await this.sessionStore.save(storedUser);

        return { user: storedUser };
    }
}
