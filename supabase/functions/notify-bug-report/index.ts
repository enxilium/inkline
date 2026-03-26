interface NotifyBugReportPayload {
    reportId?: string | null;
    reportSource?: string | null;
    userId?: string | null;
    projectId?: string | null;
    note?: string | null;
    appVersion?: string | null;
    payload?: Record<string, unknown>;
    createdAt?: string | null;
}

const toSafeString = (value: unknown): string => {
    if (typeof value !== "string") {
        return "";
    }
    return value.trim();
};

const truncate = (value: string, maxLength: number): string => {
    if (value.length <= maxLength) {
        return value;
    }
    return `${value.slice(0, maxLength - 3)}...`;
};

Deno.serve(async (request) => {
    if (request.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const inboxEmail = Deno.env.get("CONTACT_TO_EMAIL");
    const fromEmail = Deno.env.get("CONTACT_FROM_EMAIL");

    if (!resendApiKey || !inboxEmail || !fromEmail) {
        return new Response(
            JSON.stringify({
                ok: false,
                message:
                    "Missing RESEND_API_KEY, CONTACT_TO_EMAIL, or CONTACT_FROM_EMAIL.",
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    const body = (await request.json()) as NotifyBugReportPayload;

    const reportId = toSafeString(body.reportId) || "unknown";
    const reportSource = toSafeString(body.reportSource) || "unknown";
    const userId = toSafeString(body.userId) || "unknown";
    const projectId = toSafeString(body.projectId) || "(none)";
    const appVersion = toSafeString(body.appVersion) || "(unknown)";
    const createdAt = toSafeString(body.createdAt) || new Date().toISOString();

    const description =
        typeof body.payload?.description === "string"
            ? body.payload.description
            : "(no description provided)";
    const note = toSafeString(body.note) || "(no note)";

    const emailText = [
        "New Inkline issue report",
        "",
        `Report ID: ${reportId}`,
        `Source: ${reportSource}`,
        `User ID: ${userId}`,
        `Project ID: ${projectId}`,
        `App Version: ${appVersion}`,
        `Created At: ${createdAt}`,
        "",
        "Description:",
        description,
        "",
        "Note:",
        note,
    ].join("\n");

    const emailSubject = truncate(
        `[Inkline] Report ${reportId} (${reportSource})`,
        120,
    );

    const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: fromEmail,
            to: [inboxEmail],
            subject: emailSubject,
            text: emailText,
        }),
    });

    if (!resendResponse.ok) {
        const errorText = await resendResponse.text();
        return new Response(
            JSON.stringify({ ok: false, message: errorText }),
            {
                status: 502,
                headers: { "Content-Type": "application/json" },
            },
        );
    }

    return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
    });
});
