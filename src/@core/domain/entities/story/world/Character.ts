/**
 * Character entity representing a character in the story world.
 */
export class Character {
    constructor(
        public id: string,
        public name: string,
        public race: string,
        public age: number | null,
        public description: string,
        public currentLocationId: string | null,
        public backgroundLocationId: string | null,
        public organizationId: string | null,
        public traits: string[],
        public goals: string[],
        public secrets: string[],
        public quote: string,
        public quoteAudioUrl: string | null,
        public quoteAudioStoragePath: string | null,
        public tags: string[],
        public voiceId: string | null,
        public bgmId: string | null,
        public playlistId: string | null,
        public galleryImageIds: string[],
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
