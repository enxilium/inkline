import { Controller } from "../Controller";
import { ResetPassword } from "../../../@core/application/use-cases/auth/ResetPassword";

export class ResetPasswordController
    implements
        Controller<
            Parameters<ResetPassword["execute"]>,
            Awaited<ReturnType<ResetPassword["execute"]>>
        >
{
    constructor(private readonly resetPassword: ResetPassword) {}

    async handle(
        ...args: Parameters<ResetPassword["execute"]>
    ): Promise<Awaited<ReturnType<ResetPassword["execute"]>>> {
        return this.resetPassword.execute(...args);
    }
}
