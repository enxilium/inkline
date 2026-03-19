import { fileSystemService } from "../../storage/FileSystemService";
import type { EntityType } from "./DeletionLog";

export type PendingRemoteDeletionLog = {
    entityType: EntityType;
    entityId: string;
    projectId: string;
    userId: string;
    deletedAt: string;
    attempts: number;
    createdAt: number;
    updatedAt: number;
    nextRetryAt?: number;
    lastError?: string;
    terminalReported?: boolean;
};

export class PendingRemoteDeletionLogs {
    private static readonly FILE_NAME = "pending_remote_deletion_logs.json";
    private static readonly SYNC_DIR = "sync";
    private mutex = Promise.resolve();
    private activeUserId: string | null = null;

    setActiveUserId(userId: string): void {
        this.activeUserId = userId.trim() || null;
    }

    clearActiveUserId(): void {
        this.activeUserId = null;
    }

    async clearForUser(userId: string): Promise<void> {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) {
            return;
        }

        await fileSystemService.deleteFile(this.getPath(normalizedUserId));
    }

    async add(entry: PendingRemoteDeletionLog, userId?: string): Promise<void> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const all = await this.readAllInternal(scopedUserId);
            const dedupeKey = this.getEntryKey(entry.entityId, entry.deletedAt);
            const next = all.filter(
                (item) =>
                    this.getEntryKey(item.entityId, item.deletedAt) !==
                    dedupeKey,
            );
            next.push(entry);
            await this.writeAllInternal(scopedUserId, next);
        } finally {
            unlock();
        }
    }

    async remove(
        entityId: string,
        deletedAt: string,
        userId?: string,
    ): Promise<void> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const all = await this.readAllInternal(scopedUserId);
            const key = this.getEntryKey(entityId, deletedAt);
            const next = all.filter(
                (item) =>
                    this.getEntryKey(item.entityId, item.deletedAt) !== key,
            );
            await this.writeAllInternal(scopedUserId, next);
        } finally {
            unlock();
        }
    }

    async getAll(userId?: string): Promise<PendingRemoteDeletionLog[]> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            return await this.readAllInternal(scopedUserId);
        } finally {
            unlock();
        }
    }

    async updateAttempts(
        entityId: string,
        deletedAt: string,
        options: {
            attempts: number;
            updatedAt?: number;
            lastError?: string;
            nextRetryAt?: number;
            terminalReported?: boolean;
        },
        userId?: string,
    ): Promise<void> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const all = await this.readAllInternal(scopedUserId);
            const key = this.getEntryKey(entityId, deletedAt);
            const next = all.map((item) =>
                this.getEntryKey(item.entityId, item.deletedAt) !== key
                    ? item
                    : {
                          ...item,
                          attempts: options.attempts,
                          updatedAt: options.updatedAt ?? Date.now(),
                          lastError: options.lastError,
                          nextRetryAt: options.nextRetryAt,
                          terminalReported:
                              options.terminalReported ?? item.terminalReported,
                      },
            );
            await this.writeAllInternal(scopedUserId, next);
        } finally {
            unlock();
        }
    }

    private lock(): Promise<() => void> {
        let unlockNext!: () => void;

        const willLock = new Promise<void>((resolve) => {
            unlockNext = resolve;
        });

        const willUnlock = this.mutex.then(() => unlockNext);

        this.mutex = willLock;

        return willUnlock;
    }

    private resolveUserId(userId?: string): string {
        const normalized = userId?.trim();
        if (normalized) {
            return normalized;
        }

        if (!this.activeUserId) {
            throw new Error(
                "PendingRemoteDeletionLogs user scope is not initialized. Call setActiveUserId first.",
            );
        }

        return this.activeUserId;
    }

    private getPath(userId: string): string {
        return [
            "users",
            userId,
            PendingRemoteDeletionLogs.SYNC_DIR,
            PendingRemoteDeletionLogs.FILE_NAME,
        ].join("/");
    }

    private getEntryKey(entityId: string, deletedAt: string): string {
        return `${entityId}:${deletedAt}`;
    }

    private async readAllInternal(
        userId: string,
    ): Promise<PendingRemoteDeletionLog[]> {
        const data = await fileSystemService.readJson<
            PendingRemoteDeletionLog[]
        >(this.getPath(userId));
        return data || [];
    }

    private async writeAllInternal(
        userId: string,
        data: PendingRemoteDeletionLog[],
    ): Promise<void> {
        await fileSystemService.writeJson(this.getPath(userId), data);
    }
}

export const pendingRemoteDeletionLogs = new PendingRemoteDeletionLogs();
