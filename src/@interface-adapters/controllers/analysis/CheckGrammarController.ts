import { Controller } from "../Controller";
import { CheckGrammar } from "../../../@core/application/use-cases/analysis/CheckGrammar";
import type {
    GrammarCheckRequest,
    LanguageToolResponse,
} from "../../../@core/domain/services/ILanguageToolService";

export class CheckGrammarController
    implements Controller<[GrammarCheckRequest], LanguageToolResponse>
{
    constructor(private readonly checkGrammar: CheckGrammar) {}

    async handle(request: GrammarCheckRequest): Promise<LanguageToolResponse> {
        return this.checkGrammar.execute(request);
    }
}
