import { Controller } from "../Controller";
import { UpdateUserEmail } from "../../../@core/application/use-cases/auth/UpdateUserEmail";
import type { AuthStateGateway } from "./AuthStateGateway";

export class UpdateUserEmailController
    implements
        Controller<
            Parameters<UpdateUserEmail["execute"]>,
            Awaited<ReturnType<UpdateUserEmail["execute"]>>
        >
{
    constructor(
        private readonly updateUserEmail: UpdateUserEmail,
        private readonly authStateGateway: AuthStateGateway
    ) {}

    async handle(
        ...args: Parameters<UpdateUserEmail["execute"]>
    ): Promise<Awaited<ReturnType<UpdateUserEmail["execute"]>>> {
        const response = await this.updateUserEmail.execute(...args);
        this.authStateGateway.setUser(response.user);
        return response;
    }
}
