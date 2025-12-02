/**
 * Interface for generating audio content for characters or locations.
 */

import { Character } from "../entities/story/world/Character";
import { Location } from "../entities/story/world/Location";
import { Organization } from "../entities/story/world/Organization";

export interface IAudioGenerationService {
    /**
     * Generates background music for a character, location, or organization.
     * @param subject The world entity to generate BGM for.
     */
    generateBGM(
        subject: Character | Location | Organization,
        onProgress: (progress: number) => void
    ): Promise<ArrayBuffer>;
}
