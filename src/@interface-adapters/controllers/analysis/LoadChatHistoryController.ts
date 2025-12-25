import { Controller } from "../Controller";
import { LoadChatHistory } from "../../../@core/application/use-cases/analysis/LoadChatHistory";

export class LoadChatHistoryController
    implements
        Controller<
            Parameters<LoadChatHistory["execute"]>,
            Awaited<ReturnType<LoadChatHistory["execute"]>>
        >
{
    constructor(private readonly useCase: LoadChatHistory) {}

    async handle(
        ...args: Parameters<LoadChatHistory["execute"]>
    ): Promise<Awaited<ReturnType<LoadChatHistory["execute"]>>> {
        return this.useCase.execute(...args);
    }
}
