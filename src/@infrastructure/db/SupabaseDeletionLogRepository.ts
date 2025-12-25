import { SupabaseService } from "./SupabaseService";

export type RemoteDeletionLogEntry = {
    id: string;
    entity_id: string;
    entity_type: string;
    project_id: string;
    deleted_at: string;
    user_id: string;
};

export class SupabaseDeletionLogRepository {
    async create(
        entityId: string,
        entityType: string,
        projectId: string,
        userId: string
    ): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("deletion_logs").insert({
            entity_id: entityId,
            entity_type: entityType,
            project_id: projectId,
            user_id: userId,
            deleted_at: new Date().toISOString(),
        });

        if (error) {
            console.error("Failed to create remote deletion log", error);
            // We don't throw here because the actual deletion might have succeeded,
            // and failing here would be annoying. But ideally we want this to succeed.
        }
    }

    async findAllByUserId(userId: string): Promise<RemoteDeletionLogEntry[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("deletion_logs")
            .select("*")
            .eq("user_id", userId);

        if (error) {
            console.error("Failed to fetch remote deletion logs", error);
            return [];
        }

        return data as RemoteDeletionLogEntry[];
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("deletion_logs")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Failed to delete remote deletion log entry", error);
        }
    }

    /**
     * Remove deletion log entries older than the specified number of days.
     * Called on app launch to prevent unbounded log growth.
     */
    async cleanupOldEntries(
        userId: string,
        olderThanDays = 30
    ): Promise<number> {
        const client = SupabaseService.getClient();
        const cutoffDate = new Date(
            Date.now() - olderThanDays * 24 * 60 * 60 * 1000
        ).toISOString();

        const { data, error } = await client
            .from("deletion_logs")
            .delete()
            .eq("user_id", userId)
            .lt("deleted_at", cutoffDate)
            .select("id");

        if (error) {
            console.error("Failed to cleanup old remote deletion logs", error);
            return 0;
        }

        const removedCount = data?.length ?? 0;
        if (removedCount > 0) {
            console.log(
                `[SupabaseDeletionLogRepository] Cleaned up ${removedCount} entries older than ${olderThanDays} days`
            );
        }

        return removedCount;
    }
}
