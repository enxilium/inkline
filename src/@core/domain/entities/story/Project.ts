/**
 * Project represents the top-level manuscript and its associated assets.
 */
export class Project {
    constructor(
        public id: string,
        public title: string,
        public coverImageId: string | null,
        public chapterIds: string[],
        public characterIds: string[],
        public locationIds: string[],
        public scrapNoteIds: string[],
        public organizationIds: string[],
        public timelineIds: string[],
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
