import { Controller } from "../Controller";
import { LoadChatMessages } from "../../../@core/application/use-cases/analysis/LoadChatMessages";

export class LoadChatMessagesController
    implements
        Controller<
            Parameters<LoadChatMessages["execute"]>,
            Awaited<ReturnType<LoadChatMessages["execute"]>>
        >
{
    constructor(private readonly useCase: LoadChatMessages) {}

    async handle(
        ...args: Parameters<LoadChatMessages["execute"]>
    ): Promise<Awaited<ReturnType<LoadChatMessages["execute"]>>> {
        return this.useCase.execute(...args);
    }
}
