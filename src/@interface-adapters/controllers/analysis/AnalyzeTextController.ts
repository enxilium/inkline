import { Controller } from "../Controller";
import { AnalyzeText } from "../../../@core/application/use-cases/analysis/AnalyzeText";

export class AnalyzeTextController
    implements
        Controller<Parameters<AnalyzeText["execute"]>, { analysis: string }>
{
    constructor(private readonly analyzeText: AnalyzeText) {}

    async handle(
        ...args: Parameters<AnalyzeText["execute"]>
    ): Promise<{ analysis: string }> {
        const result = await this.analyzeText.execute(...args);
        let analysis = "";
        for await (const chunk of result.stream) {
            analysis += chunk;
        }
        return { analysis };
    }
}
