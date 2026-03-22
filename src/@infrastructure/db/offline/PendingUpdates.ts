import { fileSystemService } from "../../storage/FileSystemService";

export type PendingUpdateEntityType =
    | "project"
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

export type PendingUpdate = {
    entityType: PendingUpdateEntityType;
    entityId: string;
    projectId: string;
    operation: "create" | "update" | "delete" | "updateContent" | "save";
    payload: unknown;
    attempts: number;
    createdAt: number;
    updatedAt: number;
    nextRetryAt?: number;
    lastError?: string;
    terminalReported?: boolean;
};

export class PendingUpdates {
    private static readonly FILE_NAME = "pending_updates.json";
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

    async add(item: PendingUpdate, userId?: string): Promise<void> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const all = await this.readAllInternal(scopedUserId);
            const key = this.getEntryKey(item.entityId, item.operation);
            const next = all.filter(
                (entry) =>
                    this.getEntryKey(entry.entityId, entry.operation) !== key,
            );
            next.push(item);
            await this.writeAllInternal(scopedUserId, next);
        } finally {
            unlock();
        }
    }

    async remove(
        entityId: string,
        operation: PendingUpdate["operation"],
        userId?: string,
    ): Promise<void> {
        const unlock = await this.lock();
        try {
            const scopedUserId = this.resolveUserId(userId);
            const all = await this.readAllInternal(scopedUserId);
            const key = this.getEntryKey(entityId, operation);
            const next = all.filter(
                (entry) =>
                    this.getEntryKey(entry.entityId, entry.operation) !== key,
            );
            await this.writeAllInternal(scopedUserId, next);
        } finally {
            unlock();
        }
    }

    async getAll(userId?: string): Promise<PendingUpdate[]> {
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
        operation: PendingUpdate["operation"],
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
            const key = this.getEntryKey(entityId, operation);
            const next = all.map((entry) =>
                this.getEntryKey(entry.entityId, entry.operation) !== key
                    ? entry
                    : {
                          ...entry,
                          attempts: options.attempts,
                          updatedAt: options.updatedAt ?? Date.now(),
                          lastError: options.lastError,
                          nextRetryAt: options.nextRetryAt,
                          terminalReported:
                              options.terminalReported ??
                              entry.terminalReported,
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
                "PendingUpdates user scope is not initialized. Call setActiveUserId first.",
            );
        }

        return this.activeUserId;
    }

    private getPath(userId: string): string {
        return [
            "users",
            userId,
            PendingUpdates.SYNC_DIR,
            PendingUpdates.FILE_NAME,
        ].join("/");
    }

    private getEntryKey(
        entityId: string,
        operation: PendingUpdate["operation"],
    ): string {
        return `${entityId}:${operation}`;
    }

    private async readAllInternal(userId: string): Promise<PendingUpdate[]> {
        const data = await fileSystemService.readJson<PendingUpdate[]>(
            this.getPath(userId),
        );
        return data || [];
    }

    private async writeAllInternal(
        userId: string,
        data: PendingUpdate[],
    ): Promise<void> {
        await fileSystemService.writeJson(this.getPath(userId), data);
    }
}

export const pendingUpdates = new PendingUpdates();
