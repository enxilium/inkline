import { Playlist } from "../entities/story/world/Playlist";
import { Character } from "../entities/story/world/Character";
import { Location } from "../entities/story/world/Location";
import { Organization } from "../entities/story/world/Organization";

export interface IPlaylistGenerationService {
    /**
     * Generates a curated playlist of existing songs based on a mood/description.
     * (Likely uses an LLM to suggest tracks).
     * @param subject The subject (Character, Organization, or Location) to generate the playlist for.
     */
    generatePlaylist(
        subject: Character | Location | Organization
    ): Promise<Playlist>;
}
