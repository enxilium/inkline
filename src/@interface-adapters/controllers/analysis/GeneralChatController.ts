import { Controller } from "../Controller";
import { GeneralChat } from "../../../@core/application/use-cases/analysis/GeneralChat";

export class GeneralChatController
    implements
        Controller<
            Parameters<GeneralChat["execute"]>,
            { reply: string; conversationId: string }
        >
{
    constructor(private readonly generalChat: GeneralChat) {}

    async handle(
        ...args: Parameters<GeneralChat["execute"]>
    ): Promise<{ reply: string; conversationId: string }> {
        const result = await this.generalChat.execute(...args);
        let reply = "";
        for await (const chunk of result.stream) {
            reply += chunk;
        }
        return { reply, conversationId: result.conversationId };
    }
}
