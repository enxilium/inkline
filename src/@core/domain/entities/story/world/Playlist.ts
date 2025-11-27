export interface PlaylistTrack {
    id: string;
    title: string;
    artist: string;
    album?: string;
    url: string;
    durationSeconds: number;
}

export type PlaylistSubjectType =
    | "character"
    | "location"
    | "organization"
    | "project";

/**
 * Playlist entity bundling curated music for inspiration or reference.
 */
export class Playlist {
    constructor(
        public id: string,
        public name: string,
        public description: string,
        public tracks: PlaylistTrack[],
        public url: string,
        public storagePath: string,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
