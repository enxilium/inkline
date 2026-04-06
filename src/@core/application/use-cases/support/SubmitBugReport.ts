import {
    BugReportRecord,
    IBugReportRepository,
} from "../../../domain/repositories/IBugReportRepository";

export type SubmitBugReportRequest = {
    userId?: string | null;
    projectId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    failureFingerprint?: string | null;
    reportSource?: "sync_terminal" | "manual_help_menu";
    payload: Record<string, unknown>;
    note?: string | null;
    appVersion?: string | null;
};

export type SubmitBugReportResponse = {
    accepted: true;
};

export class SubmitBugReport {
    private static readonly MAX_NOTE_LENGTH = 280;
    private static readonly MAX_PAYLOAD_BYTES = 256 * 1024;

    constructor(private readonly bugReportRepository: IBugReportRepository) {}

    private buildFailureFingerprint(raw?: string | null): string {
        const normalized = raw?.trim();
        if (normalized) {
            return normalized;
        }

        return `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }

    async execute(
        request: SubmitBugReportRequest,
    ): Promise<SubmitBugReportResponse> {
        const normalizedUserId = request.userId?.trim();
        const userId = normalizedUserId ? normalizedUserId : null;

        const failureFingerprint = this.buildFailureFingerprint(
            request.failureFingerprint,
        );
        if (!failureFingerprint) {
            throw new Error("Failure fingerprint is required.");
        }

        const reportSource = request.reportSource
            ? request.reportSource
            : request.failureFingerprint?.trim()
              ? "sync_terminal"
              : "manual_help_menu";

        const note = (request.note ?? "").trim();
        if (note.length > SubmitBugReport.MAX_NOTE_LENGTH) {
            throw new Error(
                `Bug report note must be at most ${SubmitBugReport.MAX_NOTE_LENGTH} characters.`,
            );
        }

        const serializedPayload = JSON.stringify(request.payload ?? {});
        const payloadBytes = new TextEncoder().encode(serializedPayload).length;
        if (payloadBytes > SubmitBugReport.MAX_PAYLOAD_BYTES) {
            throw new Error(
                `Bug report payload exceeds ${SubmitBugReport.MAX_PAYLOAD_BYTES} bytes.`,
            );
        }

        const payload = JSON.parse(serializedPayload) as Record<
            string,
            unknown
        >;

        const record: BugReportRecord = {
            userId,
            projectId: request.projectId?.trim() || null,
            entityType: request.entityType?.trim() || null,
            entityId: request.entityId?.trim() || null,
            failureFingerprint,
            reportSource,
            payload,
            note: note || null,
            appVersion: request.appVersion?.trim() || null,
            createdAt: new Date(),
        };

        await this.bugReportRepository.create(record);

        return { accepted: true };
    }
}
