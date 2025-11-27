import { User } from "../../../domain/entities/user/User";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IAuthService } from "../../../domain/services/IAuthService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface RegisterUserRequest {
    email: string;
    password: string;
}

export interface RegisterUserResponse {
    user: User;
}

export class RegisterUser {
    constructor(
        private readonly authService: IAuthService,
        private readonly userRepository: IUserRepository,
        private readonly sessionStore: IUserSessionStore
    ) {}

    async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
        const email = request.email.trim().toLowerCase();
        const password = request.password;

        if (!email) {
            throw new Error("Email is required to register.");
        }

        if (!password) {
            throw new Error("Password is required to register.");
        }

        // 1. Register in Auth Provider (Supabase Auth)
        const user = await this.authService.register(email, password);

        // 2. Create User in Application Database (public.users)
        // Note: If you use Supabase Triggers to auto-create users in public table,
        // this might be redundant or need to be an 'update' instead.
        // For now, we'll try to create it, and if it exists (due to trigger), we update it.

        const existingUser = await this.userRepository.findById(user.id);
        if (!existingUser) {
            try {
                await this.userRepository.create(user);
            } catch (error) {
                const message = (error as Error)?.message ?? "";
                const isRlsViolation = message
                    .toLowerCase()
                    .includes("row-level security");

                if (!isRlsViolation) {
                    throw error;
                }

                // If the Supabase session is not established yet (common immediately after sign-up
                // when email confirmation is required), the insert is blocked by RLS. We allow
                // registration to proceed and rely on the first authenticated login to create the
                // public users row once auth.uid() is available to the client.
            }
        } else {
            // If it already exists (e.g. via trigger), just ensure fields are up to date
            await this.userRepository.update(user);
        }

        await this.sessionStore.save(user);

        return { user };
    }
}
