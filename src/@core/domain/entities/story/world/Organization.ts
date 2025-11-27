/**
 * Organization captures groups, factions, guilds, or institutions within the story world.
 */
export class Organization {
    constructor(
        public id: string,
        public name: string,
        public description: string,
        public mission: string,
        public tags: string[],
        public locationIds: string[],
        public galleryImageIds: string[],
        public playlistId: string | null,
        public bgmId: string | null,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
