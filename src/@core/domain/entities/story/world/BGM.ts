export type BGMSubjectType =
    | "character"
    | "location"
    | "organization"
    | "project";

/**
 * Background music metadata for narrative elements.
 */
export class BGM {
    constructor(
        public id: string,
        public title: string,
        public artist: string,
        public url: string,
        public storagePath: string,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
