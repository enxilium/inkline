import {
    BugReportRecord,
    IBugReportRepository,
} from "../../@core/domain/repositories/IBugReportRepository";
import { SupabaseService } from "./SupabaseService";

export class SupabaseBugReportRepository implements IBugReportRepository {
    async create(record: BugReportRecord): Promise<void> {
        const client = SupabaseService.getClient();

        const { data, error } = await client
            .from("bug_reports")
            .insert({
                user_id: record.userId,
                project_id: record.projectId,
                entity_type: record.entityType,
                entity_id: record.entityId,
                failure_fingerprint: record.failureFingerprint,
                report_source: record.reportSource,
                payload: record.payload,
                note: record.note,
                app_version: record.appVersion,
                created_at: record.createdAt.toISOString(),
            })
            .select("id")
            .single();

        if (error) {
            throw new Error(error.message);
        }

        if (record.reportSource !== "manual_help_menu") {
            return;
        }

        // Alerting is best-effort. Report persistence remains the source of truth.
        try {
            await client.functions.invoke("notify-bug-report", {
                body: {
                    reportId: data?.id ?? null,
                    reportSource: record.reportSource,
                    userId: record.userId,
                    projectId: record.projectId,
                    note: record.note,
                    appVersion: record.appVersion,
                    payload: record.payload,
                    createdAt: record.createdAt.toISOString(),
                },
            });
        } catch (invokeError) {
            console.warn("Bug report alert invocation failed", invokeError);
        }
    }
}
