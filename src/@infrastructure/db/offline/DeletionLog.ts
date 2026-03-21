import { fileSystemService } from "../../storage/FileSystemService";

export type EntityType =
    | "chapter"
    | "character"
    | "location"
    | "organization"
    | "scrapNote"
    | "editorTemplate"
    | "metafieldDefinition"
    | "metafieldAssignment"
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
    private static readonly SYNC_DIR = "sync";
    private mutex = Promise.resolve();
    private activeUserId: string | null = null;

    private lock(): Promise<() => void> {
        let unlockNext!: () => void;

        const willLock = new Promise<void>((resolve) => {
            unlockNext = resolve;
        });

        const willUnlock = this.mutex.then(() => unlockNext);

        this.mutex = willLock;

        return willUnlock;
    }

    setActiveUserId(userId: string): void {
        this.activeUserId = userId.trim() || null;
    }

    clearActiveUserId(): void {
        this.activeUserId = null;
    }

    private resolveUserId(userId?: string): string {
        const normalized = userId?.trim();
        if (normalized) {
            return normalized;
        }

        if (!this.activeUserId) {
            throw new Error(
                "DeletionLog user scope is not initialized. Call setActiveUserId first.",
            );
        }

        return this.activeUserId;
    }

    private getLogPath(userId: string): string {
        return [
            "users",
            userId,
            DeletionLog.SYNC_DIR,
            DeletionLog.FILE_NAME,
        ].join("/");
    }

    async clearForUser(userId: string): Promise<void> {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) {
            return;
        }

        const path = this.getLogPath(normalizedUserId);
        await fileSystemService.deleteFile(path);
    }

    async add(deletion: PendingDeletion, userId?: string): Promise<void> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const log = await this.getAllInternal(scopedUserId);
            log.push(deletion);
            await this.saveInternal(scopedUserId, log);
        } finally {
            unlock();
        }
    }

    async remove(entityId: string, userId?: string): Promise<void> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const log = await this.getAllInternal(scopedUserId);
            const newLog = log.filter((d) => d.entityId !== entityId);
            await this.saveInternal(scopedUserId, newLog);
        } finally {
            unlock();
        }
    }

    async getAll(userId?: string): Promise<PendingDeletion[]> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            return await this.getAllInternal(scopedUserId);
        } finally {
            unlock();
        }
    }

    async isDeleted(entityId: string, userId?: string): Promise<boolean> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const log = await this.getAllInternal(scopedUserId);
            return log.some((d) => d.entityId === entityId);
        } finally {
            unlock();
        }
    }

    /**
     * Remove deletion log entries older than the specified number of days.
     * Called on app launch to prevent unbounded log growth.
     */
    async cleanupOldEntries(
        olderThanDays = 30,
        userId?: string,
    ): Promise<number> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const log = await this.getAllInternal(scopedUserId);
            const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
            const newLog = log.filter((d) => d.timestamp > cutoffTime);
            const removedCount = log.length - newLog.length;

            if (removedCount > 0) {
                await this.saveInternal(scopedUserId, newLog);
            }

            return removedCount;
        } finally {
            unlock();
        }
    }

    private async getAllInternal(userId: string): Promise<PendingDeletion[]> {
        const path = this.getLogPath(userId);
        const log = await fileSystemService.readJson<PendingDeletion[]>(path);
        return log || [];
    }

    private async saveInternal(
        userId: string,
        log: PendingDeletion[],
    ): Promise<void> {
        const path = this.getLogPath(userId);
        await fileSystemService.writeJson(path, log);
    }
}

export const deletionLog = new DeletionLog();
