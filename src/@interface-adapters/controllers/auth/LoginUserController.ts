import { Controller } from "../Controller";
import { LoginUser } from "../../../@core/application/use-cases/auth/LoginUser";
import type { AuthStateGateway } from "./AuthStateGateway";

export class LoginUserController
    implements
        Controller<
            Parameters<LoginUser["execute"]>,
            Awaited<ReturnType<LoginUser["execute"]>>
        >
{
    constructor(
        private readonly loginUser: LoginUser,
        private readonly authStateGateway: AuthStateGateway
    ) {}

    async handle(
        ...args: Parameters<LoginUser["execute"]>
    ): Promise<Awaited<ReturnType<LoginUser["execute"]>>> {
        const response = await this.loginUser.execute(...args);
        this.authStateGateway.setUser(response.user);
        return response;
    }
}
