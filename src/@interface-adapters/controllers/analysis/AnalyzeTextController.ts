import { Controller } from "../Controller";
import { AnalyzeText } from "../../../@core/application/use-cases/analysis/AnalyzeText";

export class AnalyzeTextController
    implements
        Controller<
            Parameters<AnalyzeText["execute"]>,
            Awaited<ReturnType<AnalyzeText["execute"]>>
        >
{
    constructor(private readonly analyzeText: AnalyzeText) {}

    async handle(
        ...args: Parameters<AnalyzeText["execute"]>
    ): Promise<Awaited<ReturnType<AnalyzeText["execute"]>>> {
        return this.analyzeText.execute(...args);
    }
}
