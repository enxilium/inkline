import { RegisterUser } from "../../../@core/application/use-cases/auth/RegisterUser";
import { Controller } from "../Controller";

export class RegisterUserController implements Controller<
    Parameters<RegisterUser["execute"]>,
    Awaited<ReturnType<RegisterUser["execute"]>>
> {
    constructor(private readonly registerUser: RegisterUser) {}

    async handle(
        ...args: Parameters<RegisterUser["execute"]>
    ): Promise<Awaited<ReturnType<RegisterUser["execute"]>>> {
        const response = await this.registerUser.execute(...args);
        return response;
    }
}
