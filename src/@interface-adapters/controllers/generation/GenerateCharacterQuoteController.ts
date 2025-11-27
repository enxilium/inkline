import { Controller } from "../Controller";
import { GenerateCharacterQuote } from "../../../@core/application/use-cases/generation/GenerateCharacterQuote";

export class GenerateCharacterQuoteController
    implements
        Controller<
            Parameters<GenerateCharacterQuote["execute"]>,
            Awaited<ReturnType<GenerateCharacterQuote["execute"]>>
        >
{
    constructor(
        private readonly generateCharacterQuote: GenerateCharacterQuote
    ) {}

    async handle(
        ...args: Parameters<GenerateCharacterQuote["execute"]>
    ): Promise<Awaited<ReturnType<GenerateCharacterQuote["execute"]>>> {
        return this.generateCharacterQuote.execute(...args);
    }
}
