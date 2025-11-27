import { Controller } from "../Controller";
import { LogoutUser } from "../../../@core/application/use-cases/auth/LogoutUser";
import type { AuthStateGateway } from "./AuthStateGateway";

export class LogoutUserController
    implements Controller<Parameters<LogoutUser["execute"]>, void>
{
    constructor(
        private readonly logoutUser: LogoutUser,
        private readonly authStateGateway: AuthStateGateway
    ) {}

    async handle(...args: Parameters<LogoutUser["execute"]>): Promise<void> {
        await this.logoutUser.execute(...args);
        this.authStateGateway.setUser(null);
    }
}
