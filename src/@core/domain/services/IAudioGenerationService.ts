/**
 * Interface for generating audio content for characters or locations.
 */

import { Character } from "../entities/story/world/Character";
import { Voice } from "../entities/story/world/Voice";
import { Location } from "../entities/story/world/Location";
import { Organization } from "../entities/story/world/Organization";

export interface IAudioGenerationService {
    /**
     * Designs a new voice based on a text description (e.g. using Parler-TTS).
     * Returns the audio buffer of the reference voice sample.
     * @param character The character for whom the voice is being designed.
     */
    designVoice(character: Character): Promise<ArrayBuffer>;

    /**
     * Generates speech (dialogue) using a specific voice reference (e.g. using XTTS).
     * @param text The dialogue text to speak.
     * @param voice The voice to use for generation.
     */
    generateDialogue(text: string, voice: Voice): Promise<ArrayBuffer>;

    /**
     * Generates background music for a character or location.
     * @param subject The character or location to generate BGM for.
     */
    generateBGM(
        subject: Character | Location | Organization
    ): Promise<ArrayBuffer>;
}
