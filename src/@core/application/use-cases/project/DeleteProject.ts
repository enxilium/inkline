import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IChatConversationRepository } from "../../../domain/repositories/IChatConversationRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IScrapNoteRepository } from "../../../domain/repositories/IScrapNoteRepository";
import { IStorageService } from "../../../domain/services/IStorageService";
import { DeleteChapter } from "../manuscript/DeleteChapter";
import { DeleteScrapNote } from "../manuscript/DeleteScrapNote";
import { DeleteCharacter } from "../world/DeleteCharacter";
import { DeleteLocation } from "../world/DeleteLocation";
import { DeleteOrganization } from "../world/DeleteOrganization";

export interface DeleteProjectRequest {
    projectId: string;
    userId: string;
}

export class DeleteProject {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly scrapNoteRepository: IScrapNoteRepository,
        private readonly organizationRepository: IOrganizationRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService,
        private readonly chatConversationRepository: IChatConversationRepository,
        private readonly userRepository: IUserRepository
    ) {}

    async execute(request: DeleteProjectRequest): Promise<void> {
        const projectId = request.projectId.trim();
        const userId = request.userId.trim();

        if (!projectId) {
            throw new Error("Project ID is required for deletion.");
        }

        if (!userId) {
            throw new Error("User ID is required for deletion.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error("Project owner not found.");
        }

        const userOwnsProject = user.projectIds.includes(projectId);
        if (!userOwnsProject) {
            throw new Error("User does not own this project.");
        }

        // 1. Detach from User (Top-level parent)
        user.projectIds = user.projectIds.filter((id) => id !== projectId);
        user.updatedAt = new Date();
        await this.userRepository.update(user);

        // 2. Delete all assets directly (Bottom-level dependencies)
        await this.deleteAllProjectAssets(projectId);

        // 3. Delete all child entities directly via repository
        // We do not need to update the Project entity or detach inter-entity relationships
        // because the entire world is being destroyed.
        await Promise.all([
            this.chapterRepository.deleteByProjectId(projectId),
            this.characterRepository.deleteByProjectId(projectId),
            this.locationRepository.deleteByProjectId(projectId),
            this.organizationRepository.deleteByProjectId(projectId),
            this.scrapNoteRepository.deleteByProjectId(projectId),
            this.chatConversationRepository.deleteByProjectId(projectId),
        ]);

        // 4. Delete the Project entity itself
        await this.projectRepository.delete(projectId);
    }

    private async deleteAllProjectAssets(projectId: string): Promise<void> {
        const [images, bgms, playlists, voices] = await Promise.all([
            this.assetRepository.findImagesByProjectId(projectId),
            this.assetRepository.findBGMByProjectId(projectId),
            this.assetRepository.findPlaylistsByProjectId(projectId),
            this.assetRepository.findVoicesByProjectId(projectId),
        ]);

        // Delete asset records from DB
        await Promise.all([
            this.assetRepository.deleteImagesByProjectId(projectId),
            this.assetRepository.deleteVoicesByProjectId(projectId),
            this.assetRepository.deleteBGMByProjectId(projectId),
            this.assetRepository.deletePlaylistsByProjectId(projectId),
        ]);

        // Delete files from storage
        await Promise.all([
            ...images.map((image) =>
                this.storageService.deleteFile(image.storagePath || image.url)
            ),
            ...bgms.map((track) =>
                this.storageService.deleteFile(track.storagePath || track.url)
            ),
            ...voices.map((voice) =>
                this.storageService.deleteFile(voice.storagePath || voice.url)
            ),
            ...playlists.map((playlist) => {
                const target = playlist.storagePath || playlist.url;
                return target ? this.storageService.deleteFile(target) : null;
            }),
        ]);
    }
}
