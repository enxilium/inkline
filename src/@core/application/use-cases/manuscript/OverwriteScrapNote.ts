import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";

export interface OverwriteScrapNoteRequest {
    scrapNoteId: string;
    title: string;
    content: string;
    isPinned: boolean;
}

export class OverwriteScrapNote {
    constructor(private readonly scrapNoteRepository: IScrapNoteRepository) {}

    async execute(request: OverwriteScrapNoteRequest): Promise<void> {
        const { scrapNoteId, title, content, isPinned } = request;

        const scrapNote = await this.scrapNoteRepository.findById(scrapNoteId);
        if (!scrapNote) {
            throw new Error("Scrap note not found.");
        }

        scrapNote.title = title;
        scrapNote.content = content;
        scrapNote.isPinned = isPinned;

        scrapNote.updatedAt = new Date();

        await this.scrapNoteRepository.update(scrapNote);
    }
}
