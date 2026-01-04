/**
 * ScrapNote entity captures supplemental project documents (e.g., lore sheets, clues).
 */
export class ScrapNote {
    constructor(
        public id: string,
        public title: string,
        public content: string,
        public isPinned: boolean,
        public eventId: string | null,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
