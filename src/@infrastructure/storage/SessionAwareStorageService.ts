import {
    IStorageService,
    StorageUploadResult,
    UploadAssetOptions,
} from "../../@core/domain/services/IStorageService";
import { isGuestUserId } from "../../@core/domain/constants/GuestUserConstants";
import type { IUserSessionStore } from "../../@core/domain/services/IUserSessionStore";
import { SupabaseStorageService } from "./SupabaseStorageService";
import {
    FileSystemStorageService,
    isLocalAssetPath,
} from "./FileSystemStorageService";

export class SessionAwareStorageService implements IStorageService {
    constructor(
        private readonly sessionStore: IUserSessionStore,
        private readonly cloudStorage: SupabaseStorageService,
        private readonly localStorage: FileSystemStorageService,
    ) {}

    async uploadAsset(
        fileData: ArrayBuffer,
        options: UploadAssetOptions,
    ): Promise<StorageUploadResult> {
        if (await this.shouldUseLocalStorage()) {
            return this.localStorage.uploadAsset(fileData, options);
        }

        return this.cloudStorage.uploadAsset(fileData, options);
    }

    async deleteFile(path: string): Promise<void> {
        if (isLocalAssetPath(path)) {
            await this.localStorage.deleteFile(path);
            return;
        }

        await this.cloudStorage.deleteFile(path);
    }

    getUrl(path: string): string {
        if (isLocalAssetPath(path)) {
            return this.localStorage.getUrl(path);
        }

        return this.cloudStorage.getUrl(path);
    }

    private async shouldUseLocalStorage(): Promise<boolean> {
        const sessionUser = await this.sessionStore.load();
        return !sessionUser || isGuestUserId(sessionUser.id);
    }
}
