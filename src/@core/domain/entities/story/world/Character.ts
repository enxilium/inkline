/**
 * Character entity representing a character in the story world.
 */
export class Character {
    constructor(
        public id: string,
        public name: string,
        public description: string,
        public currentLocationId: string | null,
        public backgroundLocationId: string | null,
        public organizationId: string | null,
        public bgmId: string | null,
        public playlistId: string | null,
        public galleryImageIds: string[],
        public createdAt: Date,
        public updatedAt: Date,
    ) {}
}
