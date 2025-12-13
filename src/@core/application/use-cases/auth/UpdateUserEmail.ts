import { User } from "../../../domain/entities/user/User";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IAuthService } from "../../../domain/services/IAuthService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface UpdateUserEmailRequest {
    newEmail: string;
}

export interface UpdateUserEmailResponse {
    user: User;
}

export class UpdateUserEmail {
    constructor(
        private readonly authService: IAuthService,
        private readonly userRepository: IUserRepository,
        private readonly sessionStore: IUserSessionStore
    ) {}

    async execute(
        request: UpdateUserEmailRequest
    ): Promise<UpdateUserEmailResponse> {
        const newEmail = request.newEmail.trim().toLowerCase();

        if (!newEmail) {
            throw new Error("Email is required.");
        }

        const storedUser = await this.sessionStore.load();
        if (!storedUser) {
            throw new Error("You must be signed in to update your email.");
        }

        const updatedAuthUser = await this.authService.updateEmail(newEmail);

        storedUser.email = updatedAuthUser.email || newEmail;
        storedUser.updatedAt = new Date();

        await this.userRepository.update(storedUser);
        await this.sessionStore.save(storedUser);

        return { user: storedUser };
    }
}
