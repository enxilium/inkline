import { Controller } from "../Controller";
import { OverwriteChapter } from "../../../@core/application/use-cases/manuscript/OverwriteChapter";

export class OverwriteChapterController
    implements Controller<[string, string, string, number, string], void>
{
    constructor(private readonly useCase: OverwriteChapter) {}

    async handle(
        id: string,
        title: string,
        content: string,
        order: number,
        projectId: string
    ): Promise<void> {
        await this.useCase.execute({ id, title, content, order, projectId });
    }
}
