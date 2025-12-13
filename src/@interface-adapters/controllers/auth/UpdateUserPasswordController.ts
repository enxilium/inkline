import { Controller } from "../Controller";
import { UpdateUserPassword } from "../../../@core/application/use-cases/auth/UpdateUserPassword";
import type { AuthStateGateway } from "./AuthStateGateway";

export class UpdateUserPasswordController
    implements
        Controller<
            Parameters<UpdateUserPassword["execute"]>,
            Awaited<ReturnType<UpdateUserPassword["execute"]>>
        >
{
    constructor(
        private readonly updateUserPassword: UpdateUserPassword,
        private readonly authStateGateway: AuthStateGateway
    ) {}

    async handle(
        ...args: Parameters<UpdateUserPassword["execute"]>
    ): Promise<Awaited<ReturnType<UpdateUserPassword["execute"]>>> {
        const response = await this.updateUserPassword.execute(...args);
        this.authStateGateway.setUser(response.user);
        return response;
    }
}
