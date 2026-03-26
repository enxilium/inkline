export type BugReportRecord = {
    userId: string;
    projectId: string | null;
    entityType: string | null;
    entityId: string | null;
    failureFingerprint: string;
    reportSource: "sync_terminal" | "manual_help_menu";
    payload: Record<string, unknown>;
    note: string | null;
    appVersion: string | null;
    createdAt: Date;
};

export interface IBugReportRepository {
    create(record: BugReportRecord): Promise<void>;
}
