/**
 * CheckGrammar Use Case
 *
 * Orchestrates grammar checking through the LanguageTool service.
 */

import type {
    GrammarCheckRequest,
    ILanguageToolService,
    LanguageToolResponse,
} from "../../../domain/services/ILanguageToolService";

export class CheckGrammar {
    constructor(private readonly languageToolService: ILanguageToolService) {}

    /**
     * Check text for grammar and spelling issues
     */
    async execute(request: GrammarCheckRequest): Promise<LanguageToolResponse> {
        return this.languageToolService.checkGrammar(request);
    }
}
