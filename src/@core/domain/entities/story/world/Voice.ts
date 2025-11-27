export type VoiceSubjectType = "character";

/**
 * Voice entity describing synthetic or recorded voice assets for dialogue generation.
 */
export class Voice {
    constructor(
        public id: string,
        // The path/URL to the master audio file used for cloning (Parler output)
        public url: string,
        public storagePath: string,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
