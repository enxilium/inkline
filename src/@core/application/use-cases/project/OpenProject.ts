import { Chapter } from "../../../domain/entities/story/Chapter";
import { Project } from "../../../domain/entities/story/Project";
import { ScrapNote } from "../../../domain/entities/story/ScrapNote";
import { Character } from "../../../domain/entities/story/world/Character";
import { Location } from "../../../domain/entities/story/world/Location";
import { Organization } from "../../../domain/entities/story/world/Organization";
import { Image } from "../../../domain/entities/story/world/Image";
import { Voice } from "../../../domain/entities/story/world/Voice";
import { BGM } from "../../../domain/entities/story/world/BGM";
import { Playlist } from "../../../domain/entities/story/world/Playlist";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";

export interface OpenProjectRequest {
    projectId: string;
}

export interface OpenProjectResponse {
    project: Project;
    chapters: Chapter[];
    characters: Character[];
    locations: Location[];
    organizations: Organization[];
    scrapNotes: ScrapNote[];
    assets: ProjectAssetBundle;
}

export interface ProjectAssetBundle {
    images: Image[];
    voices: Voice[];
    bgms: BGM[];
    playlists: Playlist[];
}

export class OpenProject {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly scrapNoteRepository: IScrapNoteRepository,
        private readonly organizationRepository: IOrganizationRepository,
        private readonly assetRepository: IAssetRepository
    ) {}

    async execute(request: OpenProjectRequest): Promise<OpenProjectResponse> {
        const projectId = request.projectId.trim();
        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const [chapters, characters, locations, scrapNotes, organizations] =
            await Promise.all([
                this.chapterRepository.findByProjectId(projectId),
                this.characterRepository.findByProjectId(projectId),
                this.locationRepository.findByProjectId(projectId),
                this.scrapNoteRepository.findByProjectId(projectId),
                this.organizationRepository.findByProjectId(projectId),
            ]);

        chapters.sort((a, b) => a.order - b.order);

        const charactersByLocation = new Map<string, string[]>();
        const trackCharacter = (
            locationId: string | null,
            characterId: string
        ) => {
            if (!locationId) {
                return;
            }
            const list = charactersByLocation.get(locationId) ?? [];
            if (!list.includes(characterId)) {
                list.push(characterId);
                charactersByLocation.set(locationId, list);
            }
        };
        characters.forEach((character) => {
            trackCharacter(character.currentLocationId, character.id);
            trackCharacter(character.backgroundLocationId, character.id);
        });

        const organizationsByLocation = new Map<string, string[]>();
        organizations.forEach((organization) => {
            organization.locationIds.forEach((locationId) => {
                const list = organizationsByLocation.get(locationId) ?? [];
                list.push(organization.id);
                organizationsByLocation.set(locationId, list);
            });
        });

        locations.forEach((location) => {
            location.characterIds = charactersByLocation.get(location.id) ?? [];
            location.organizationIds =
                organizationsByLocation.get(location.id) ?? [];
        });

        const assetBundle = await this.resolveAssetBundle(
            projectId,
            characters,
            locations,
            organizations
        );

        return {
            project,
            chapters,
            characters,
            locations,
            organizations,
            scrapNotes,
            assets: assetBundle,
        };
    }

    private async resolveAssetBundle(
        projectId: string,
        characters: Character[],
        locations: Location[],
        organizations: Organization[]
    ): Promise<ProjectAssetBundle> {
        const imageIds = new Set<string>();
        const bgmIds = new Set<string>();
        const playlistIds = new Set<string>();
        const voiceIds = new Set<string>();

        const collectImageIds = (ids: string[]) => {
            ids.forEach((id) => {
                if (id) {
                    imageIds.add(id);
                }
            });
        };

        const collectAudioIds = (
            bgmId: string | null,
            playlistId: string | null
        ) => {
            if (bgmId) {
                bgmIds.add(bgmId);
            }
            if (playlistId) {
                playlistIds.add(playlistId);
            }
        };

        characters.forEach((character) => {
            collectImageIds(character.galleryImageIds ?? []);
            collectAudioIds(character.bgmId, character.playlistId);
            if (character.voiceId) {
                voiceIds.add(character.voiceId);
            }
        });

        locations.forEach((location) => {
            collectImageIds(location.galleryImageIds ?? []);
            collectAudioIds(location.bgmId, location.playlistId);
        });

        organizations.forEach((organization) => {
            collectImageIds(organization.galleryImageIds ?? []);
            collectAudioIds(organization.bgmId, organization.playlistId);
        });

        const [images, voices, bgms, playlists] = await Promise.all([
            imageIds.size
                ? this.assetRepository.findImagesByIds(
                      projectId,
                      Array.from(imageIds)
                  )
                : Promise.resolve([] as Image[]),
            voiceIds.size
                ? this.assetRepository.findVoicesByIds(
                      projectId,
                      Array.from(voiceIds)
                  )
                : Promise.resolve([] as Voice[]),
            bgmIds.size
                ? this.assetRepository.findBGMsByIds(
                      projectId,
                      Array.from(bgmIds)
                  )
                : Promise.resolve([] as BGM[]),
            playlistIds.size
                ? this.assetRepository.findPlaylistsByIds(
                      projectId,
                      Array.from(playlistIds)
                  )
                : Promise.resolve([] as Playlist[]),
        ]);

        return {
            images,
            voices,
            bgms,
            playlists,
        };
    }
}
