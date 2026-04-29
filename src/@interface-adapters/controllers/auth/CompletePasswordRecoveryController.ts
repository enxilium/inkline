import { Controller } from "../Controller";
import { CompletePasswordRecovery } from "../../../@core/application/use-cases/auth/CompletePasswordRecovery";

export class CompletePasswordRecoveryController
    implements
        Controller<
            Parameters<CompletePasswordRecovery["execute"]>,
            Awaited<ReturnType<CompletePasswordRecovery["execute"]>>
        >
{
    constructor(
        private readonly completePasswordRecovery: CompletePasswordRecovery,
    ) {}

    async handle(
        ...args: Parameters<CompletePasswordRecovery["execute"]>
    ): Promise<Awaited<ReturnType<CompletePasswordRecovery["execute"]>>> {
        return this.completePasswordRecovery.execute(...args);
    }
}

