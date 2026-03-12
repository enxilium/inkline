import { Controller } from "../Controller";
import { DeleteAccount } from "../../../@core/application/use-cases/auth/DeleteAccount";
import type { AuthStateGateway } from "./AuthStateGateway";

export class DeleteAccountController
    implements
        Controller<
            Parameters<DeleteAccount["execute"]>,
            Awaited<ReturnType<DeleteAccount["execute"]>>
        >
{
    constructor(
        private readonly deleteAccount: DeleteAccount,
        private readonly authStateGateway: AuthStateGateway
    ) {}

    async handle(
        ...args: Parameters<DeleteAccount["execute"]>
    ): Promise<Awaited<ReturnType<DeleteAccount["execute"]>>> {
        const response = await this.deleteAccount.execute(...args);
        this.authStateGateway.setUser(null);
        return response;
    }
}
