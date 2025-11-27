/**
 * Location entity capturing world-building details for places.
 */
export class Location {
    constructor(
        public id: string,
        public name: string,
        public description: string,
        public culture: string,
        public history: string,
        public conflicts: string[],
        public tags: string[],
        public createdAt: Date,
        public updatedAt: Date,
        public bgmId: string | null,
        public playlistId: string | null,
        public galleryImageIds: string[],
        public characterIds: string[],
        public organizationIds: string[]
    ) {}
}
