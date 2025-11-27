import { Chapter } from "../../domain/entities/story/Chapter";
import { NarrativeContext } from "../../domain/services/NarrativeContext";

export interface CharacterProfileSummary {
    name: string;
    description: string;
}

export interface LocationProfileSummary {
    name: string;
    description: string;
}

export interface OrganizationProfileSummary {
    name: string;
    description: string;
    mission?: string;
}

export const buildNarrativeContext = (
    chapters: Chapter[],
    characterProfiles: CharacterProfileSummary[],
    locationProfiles: LocationProfileSummary[],
    organizationProfiles: OrganizationProfileSummary[]
): NarrativeContext => {
    const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);

    return {
        manuscript: serializeChapters(sortedChapters),
        summary: sortedChapters
            .map((chapter) => `#${chapter.order + 1} ${chapter.title}`)
            .join(" | "),
        characterProfiles: characterProfiles
            .map((profile) => `${profile.name}: ${profile.description}`)
            .join("\n"),
        locationProfiles: locationProfiles
            .map((profile) => `${profile.name}: ${profile.description}`)
            .join("\n"),
        organizationProfiles: organizationProfiles
            .map((profile) => {
                const missionSuffix = profile.mission
                    ? ` | Mission: ${profile.mission}`
                    : "";
                return `${profile.name}: ${profile.description}${missionSuffix}`;
            })
            .join("\n"),
    };
};

const serializeChapters = (chapters: Chapter[]): string =>
    chapters
        .map(
            (chapter) =>
                `Chapter ${chapter.order + 1}: ${chapter.title}\n${chapter.content}`
        )
        .join("\n\n");
