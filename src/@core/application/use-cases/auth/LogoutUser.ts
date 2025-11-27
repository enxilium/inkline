import { IAuthService } from "../../../domain/services/IAuthService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export class LogoutUser {
    constructor(
        private readonly authService: IAuthService,
        private readonly sessionStore: IUserSessionStore
    ) {}

    async execute(): Promise<void> {
        await this.authService.logout();
        await this.sessionStore.clear();
    }
}
