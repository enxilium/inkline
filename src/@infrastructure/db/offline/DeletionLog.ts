import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

export type EntityType =
    | "chapter"
    | "character"
    | "location"
    | "organization"
    | "scrapNote"
    | "image"
    | "bgm"
    | "playlist";

export type PendingDeletion = {
    entityType: EntityType;
    entityId: string;
    projectId: string;
    timestamp: number;
};

export class DeletionLog {
    private static readonly FILE_NAME = "pending_deletions.json";
    private mutex = Promise.resolve();

    private lock(): Promise<() => void> {
        let unlockNext: () => void = () => {};

        const willLock = new Promise<void>((resolve) => {
            unlockNext = resolve;
        });

        const willUnlock = this.mutex.then(() => unlockNext);

        this.mutex = willLock;

        return willUnlock;
    }

    private async getLogPath(): Promise<string> {
        // Store in the root of inkline-data or per user?
        // Since we might not have userId in repository easily, let's store in a common place or pass userId?
        // Repositories usually have projectId.
        // Let's store it in the user's data folder if possible.
        // But FileSystemService base path is `inkline-data`.
        return DeletionLog.FILE_NAME;
    }

    async add(deletion: PendingDeletion): Promise<void> {
        const unlock = await this.lock();
        try {
            const log = await this.getAllInternal();
            log.push(deletion);
            await this.saveInternal(log);
        } finally {
            unlock();
        }
    }

    async remove(entityId: string): Promise<void> {
        const unlock = await this.lock();
        try {
            const log = await this.getAllInternal();
            const newLog = log.filter((d) => d.entityId !== entityId);
            await this.saveInternal(newLog);
        } finally {
            unlock();
        }
    }

    async getAll(): Promise<PendingDeletion[]> {
        const unlock = await this.lock();
        try {
            return await this.getAllInternal();
        } finally {
            unlock();
        }
    }

    async isDeleted(entityId: string): Promise<boolean> {
        const unlock = await this.lock();
        try {
            const log = await this.getAllInternal();
            return log.some((d) => d.entityId === entityId);
        } finally {
            unlock();
        }
    }

    /**
     * Remove deletion log entries older than the specified number of days.
     * Called on app launch to prevent unbounded log growth.
     */
    async cleanupOldEntries(olderThanDays: number = 30): Promise<number> {
        const unlock = await this.lock();
        try {
            const log = await this.getAllInternal();
            const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
            const newLog = log.filter((d) => d.timestamp > cutoffTime);
            const removedCount = log.length - newLog.length;

            if (removedCount > 0) {
                await this.saveInternal(newLog);
                console.log(
                    `[DeletionLog] Cleaned up ${removedCount} entries older than ${olderThanDays} days`
                );
            }

            return removedCount;
        } finally {
            unlock();
        }
    }

    private async getAllInternal(): Promise<PendingDeletion[]> {
        const path = await this.getLogPath();
        const log = await fileSystemService.readJson<PendingDeletion[]>(path);
        return log || [];
    }

    private async saveInternal(log: PendingDeletion[]): Promise<void> {
        const path = await this.getLogPath();
        await fileSystemService.writeJson(path, log);
    }
}

export const deletionLog = new DeletionLog();
