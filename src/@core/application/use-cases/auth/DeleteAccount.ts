import { IAuthService } from "../../../domain/services/IAuthService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface DeleteAccountResponse {
    success: boolean;
}

export class DeleteAccount {
    constructor(
        private readonly authService: IAuthService,
        private readonly sessionStore: IUserSessionStore
    ) {}

    async execute(): Promise<DeleteAccountResponse> {
        const storedUser = await this.sessionStore.load();
        if (!storedUser) {
            throw new Error("You must be signed in to delete your account.");
        }

        await this.authService.deleteAccount();
        await this.sessionStore.clear();

        return { success: true };
    }
}
