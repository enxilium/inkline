import { RegisterUser } from "../../../@core/application/use-cases/auth/RegisterUser";
import { Controller } from "../Controller";
import type { AuthStateGateway } from "./AuthStateGateway";

export class RegisterUserController
    implements
        Controller<
            Parameters<RegisterUser["execute"]>,
            Awaited<ReturnType<RegisterUser["execute"]>>
        >
{
    constructor(
        private readonly registerUser: RegisterUser,
        private readonly authStateGateway: AuthStateGateway
    ) {}

    async handle(
        ...args: Parameters<RegisterUser["execute"]>
    ): Promise<Awaited<ReturnType<RegisterUser["execute"]>>> {
        const response = await this.registerUser.execute(...args);
        this.authStateGateway.setUser(response.user);
        return response;
    }
}
