/**
 * Chapter entity represents the smallest authored storytelling unit.
 */
export class Chapter {
    constructor(
        public id: string,
        public title: string,
        public order: number,
        public content: string,
        public eventId: string | null,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
