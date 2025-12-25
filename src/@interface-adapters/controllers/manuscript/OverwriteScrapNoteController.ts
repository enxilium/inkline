import {
    OverwriteScrapNote,
    OverwriteScrapNoteRequest,
} from "../../../@core/application/use-cases/manuscript/OverwriteScrapNote";
import { Controller } from "../Controller";

export class OverwriteScrapNoteController
    implements Controller<[OverwriteScrapNoteRequest], void>
{
    constructor(private readonly useCase: OverwriteScrapNote) {}

    async handle(request: OverwriteScrapNoteRequest): Promise<void> {
        await this.useCase.execute(request);
    }
}
