import {
    BugReportRecord,
    IBugReportRepository,
} from "../../@core/domain/repositories/IBugReportRepository";
import { SupabaseService } from "./SupabaseService";

export class SupabaseBugReportRepository implements IBugReportRepository {
    async create(record: BugReportRecord): Promise<void> {
        const client = SupabaseService.getClient();

        const { error } = await client.from("bug_reports").insert({
            user_id: record.userId,
            project_id: record.projectId,
            entity_type: record.entityType,
            entity_id: record.entityId,
            failure_fingerprint: record.failureFingerprint,
            payload: record.payload,
            note: record.note,
            app_version: record.appVersion,
            created_at: record.createdAt.toISOString(),
        });

        if (error) {
            throw new Error(error.message);
        }
    }
}
