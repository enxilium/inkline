import { Playlist } from "../../../domain/entities/story/world/Playlist";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IPlaylistGenerationService } from "../../../domain/services/IPlaylistGenerationService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { generateId } from "../../utils/id";

export interface GenerateCharacterPlaylistRequest {
    projectId: string;
    characterId: string;
}

export interface GenerateCharacterPlaylistResponse {
    playlist: Playlist;
}

export class GenerateCharacterPlaylist {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly playlistGenerationService: IPlaylistGenerationService,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService
    ) {}

    async execute(
        request: GenerateCharacterPlaylistRequest
    ): Promise<GenerateCharacterPlaylistResponse> {
        const projectId = request.projectId.trim();
        const characterId = request.characterId.trim();

        if (!projectId || !characterId) {
            throw new Error("Project ID and Character ID are required.");
        }

        const character = await this.characterRepository.findById(characterId);
        if (!character) {
            throw new Error("Character not found.");
        }

        const previousPlaylist = await this.getExistingPlaylist(
            projectId,
            character
        );

        const generated =
            await this.playlistGenerationService.generatePlaylist(character);
        const now = new Date();

        const playlist = new Playlist(
            generateId(),
            generated.name,
            generated.description,
            generated.tracks,
            generated.url,
            generated.storagePath ?? "",
            now,
            now
        );

        await this.assetRepository.savePlaylist(projectId, playlist);

        character.playlistId = playlist.id;
        character.updatedAt = now;
        await this.characterRepository.update(character);

        await this.deletePlaylistAsset(projectId, previousPlaylist);

        return { playlist };
    }

    private async getExistingPlaylist(
        projectId: string,
        character: { playlistId: string | null }
    ): Promise<Playlist | null> {
        if (!character.playlistId) {
            return null;
        }

        const existing = await this.assetRepository.findPlaylistById(
            character.playlistId
        );
        return existing;
    }

    private async deletePlaylistAsset(
        projectId: string,
        playlist: Playlist | null
    ): Promise<void> {
        if (!playlist) {
            return;
        }

        await this.assetRepository.deletePlaylist(playlist.id);
        const target = playlist.storagePath || playlist.url;
        if (target) {
            await this.storageService.deleteFile(target);
        }
    }
}
