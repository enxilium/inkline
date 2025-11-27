import { Controller } from "../Controller";
import { GeneralChat } from "../../../@core/application/use-cases/analysis/GeneralChat";

export class GeneralChatController
    implements
        Controller<
            Parameters<GeneralChat["execute"]>,
            Awaited<ReturnType<GeneralChat["execute"]>>
        >
{
    constructor(private readonly generalChat: GeneralChat) {}

    async handle(
        ...args: Parameters<GeneralChat["execute"]>
    ): Promise<Awaited<ReturnType<GeneralChat["execute"]>>> {
        return this.generalChat.execute(...args);
    }
}
