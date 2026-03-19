import {
    BugReportRecord,
    IBugReportRepository,
} from "../../../domain/repositories/IBugReportRepository";

export type SubmitBugReportRequest = {
    userId: string;
    projectId?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    failureFingerprint: string;
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

    async execute(
        request: SubmitBugReportRequest,
    ): Promise<SubmitBugReportResponse> {
        const userId = request.userId.trim();
        if (!userId) {
            throw new Error(
                "Authenticated user is required to submit a bug report.",
            );
        }

        const failureFingerprint = request.failureFingerprint.trim();
        if (!failureFingerprint) {
            throw new Error("Failure fingerprint is required.");
        }

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
            payload,
            note: note || null,
            appVersion: request.appVersion?.trim() || null,
            createdAt: new Date(),
        };

        await this.bugReportRepository.create(record);

        return { accepted: true };
    }
}
