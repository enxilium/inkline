import { Controller } from "../Controller";
import { SubmitBugReport } from "../../../@core/application/use-cases/support/SubmitBugReport";

export class SubmitBugReportController implements Controller<
    Parameters<SubmitBugReport["execute"]>,
    Awaited<ReturnType<SubmitBugReport["execute"]>>
> {
    constructor(private readonly submitBugReport: SubmitBugReport) {}

    async handle(
        ...args: Parameters<SubmitBugReport["execute"]>
    ): Promise<Awaited<ReturnType<SubmitBugReport["execute"]>>> {
        return this.submitBugReport.execute(...args);
    }
}
