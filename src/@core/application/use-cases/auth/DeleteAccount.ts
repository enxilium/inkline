import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IAuthService } from "../../../domain/services/IAuthService";
import { IStorageService } from "../../../domain/services/IStorageService";
import { IUserSessionStore } from "../../../domain/services/IUserSessionStore";

export interface DeleteAccountResponse {
    success: boolean;
}

export class DeleteAccount {
    constructor(
        private readonly authService: IAuthService,
        private readonly sessionStore: IUserSessionStore,
        private readonly projectRepository: IProjectRepository,
        private readonly assetRepository: IAssetRepository,
        private readonly storageService: IStorageService,
    ) {}

    async execute(): Promise<DeleteAccountResponse> {
        const storedUser = await this.sessionStore.load();
        if (!storedUser) {
            throw new Error("You must be signed in to delete your account.");
        }

        // Delete all storage objects first — Supabase blocks direct SQL
        // deletes on storage.objects, so cascade from auth.users would fail.
        const projects = await this.projectRepository.findAllByUserId(
            storedUser.id,
        );
        for (const project of projects) {
            await this.deleteProjectStorageObjects(project.id);
        }

        await this.authService.deleteAccount();
        await this.sessionStore.clear();

        return { success: true };
    }

    private async deleteProjectStorageObjects(
        projectId: string,
    ): Promise<void> {
        const [images, bgms, playlists] = await Promise.all([
            this.assetRepository.findImagesByProjectId(projectId),
            this.assetRepository.findBGMByProjectId(projectId),
            this.assetRepository.findPlaylistsByProjectId(projectId),
        ]);

        await Promise.all([
            ...images.map((image) =>
                this.storageService.deleteFile(image.storagePath || image.url),
            ),
            ...bgms.map((track) =>
                this.storageService.deleteFile(track.storagePath || track.url),
            ),
            ...playlists.map((playlist) => {
                const target = playlist.storagePath || playlist.url;
                return target ? this.storageService.deleteFile(target) : null;
            }),
        ]);
    }
}
