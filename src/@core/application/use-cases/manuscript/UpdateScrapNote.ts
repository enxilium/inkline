import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";

export interface UpdateScrapNoteRequest {
    scrapNoteId: string;
    title?: string;
    content?: string;
    isPinned?: boolean;
}

export class UpdateScrapNote {
    constructor(private readonly scrapNoteRepository: IScrapNoteRepository) {}

    async execute(request: UpdateScrapNoteRequest): Promise<void> {
        const { scrapNoteId, title, content, isPinned } = request;

        if (!scrapNoteId.trim()) {
            throw new Error("Scrap note ID is required.");
        }

        // Optimization: If only content is being updated (autosave), use the direct update method.
        if (
            content !== undefined &&
            title === undefined &&
            isPinned === undefined
        ) {
            await this.scrapNoteRepository.updateContent(scrapNoteId, content);
            return;
        }

        const scrapNote = await this.scrapNoteRepository.findById(scrapNoteId);
        if (!scrapNote) {
            throw new Error("Scrap note not found for this project.");
        }

        if (title !== undefined) {
            if (!title.trim()) {
                throw new Error("Scrap note title cannot be empty.");
            }
            scrapNote.title = title;
        }

        if (content !== undefined) {
            scrapNote.content = content;
        }

        if (isPinned !== undefined) {
            scrapNote.isPinned = isPinned;
        }

        scrapNote.updatedAt = new Date();
        await this.scrapNoteRepository.update(scrapNote);
    }
}
