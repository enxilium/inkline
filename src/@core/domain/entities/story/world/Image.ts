export type ImageSubjectType =
    | "character"
    | "location"
    | "organization"
    | "chapter"
    | "cover"
    | "misc";

/**
 * Image entity representing AI or user generated artwork.
 */
export class Image {
    constructor(
        public id: string,
        public url: string,
        public storagePath: string,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
