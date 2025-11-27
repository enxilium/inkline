import { Character } from "../entities/story/world/Character";
import { Location } from "../entities/story/world/Location";
import { Organization } from "../entities/story/world/Organization";
import { NarrativeContext } from "./NarrativeContext";

export interface IImageGenerationService {
    /**
     * Generates a portrait image for a given character, organization, or location.
     * @param subject The entity to generate the portrait for.
     * @returns Buffer containing the image data (e.g. PNG/JPEG).
     */
    generatePortrait(
        subject: Character | Location | Organization
    ): Promise<ArrayBuffer>;

    /**
     * Generates a cover image for the project.
     * @param projectId The ID of the project to generate the cover for.
     */
    generateCover(projectId: string): Promise<ArrayBuffer>;

    /**
     * Generates a scene illustration based on a description using the supplied narrative context for grounding.
     * @param description The description of the scene.
     * @param context Narrative context describing the manuscript state.
     */
    generateScene(
        description: string,
        context: NarrativeContext
    ): Promise<ArrayBuffer>;
}
