import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { Resend } from "resend";

const WINDOW_MS = Number(
    process.env.CONTACT_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000,
);
const MAX_REQUESTS = Number(process.env.CONTACT_RATE_LIMIT_MAX ?? 5);

const contactSchema = z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(254),
    subject: z.enum([
        "Bug Report",
        "Feature Request",
        "General Inquiry",
        "Partnership",
        "Other",
    ]),
    message: z.string().trim().min(10).max(5000),
    company: z.string().trim().max(200).optional().default(""),
});

type RateLimitBucket = {
    count: number;
    resetAt: number;
};

const globalForRateLimit = globalThis as typeof globalThis & {
    contactRateLimitMap?: Map<string, RateLimitBucket>;
};

const rateLimitMap =
    globalForRateLimit.contactRateLimitMap ??
    new Map<string, RateLimitBucket>();
if (!globalForRateLimit.contactRateLimitMap) {
    globalForRateLimit.contactRateLimitMap = rateLimitMap;
}

function getClientIp(requestHeaders: Headers): string {
    const forwardedFor = requestHeaders.get("x-forwarded-for");
    if (forwardedFor) {
        return forwardedFor.split(",")[0].trim();
    }

    return requestHeaders.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string, now: number): boolean {
    const bucket = rateLimitMap.get(ip);

    if (!bucket || now > bucket.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }

    if (bucket.count >= MAX_REQUESTS) {
        return true;
    }

    bucket.count += 1;
    rateLimitMap.set(ip, bucket);
    return false;
}

export async function POST(request: Request) {
    const requestHeaders = await headers();
    const ip = getClientIp(requestHeaders);
    const now = Date.now();

    if (isRateLimited(ip, now)) {
        return NextResponse.json(
            { ok: false, error: "Too many messages. Please try again later." },
            { status: 429 },
        );
    }

    const body = await request.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                ok: false,
                error: "Please complete all fields with valid values.",
            },
            { status: 400 },
        );
    }

    const { name, email, subject, message, company } = parsed.data;

    // Hidden honeypot field should remain empty for legitimate users.
    if (company) {
        return NextResponse.json({ ok: true });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_TO_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL;

    if (!apiKey || !to || !from) {
        return NextResponse.json(
            {
                ok: false,
                error: "Contact service is not configured yet. Please try again later.",
            },
            { status: 503 },
        );
    }

    const resend = new Resend(apiKey);

    try {
        await resend.emails.send({
            from,
            to: [to],
            replyTo: email,
            subject: `[Inkline Contact] ${subject}`,
            text: [
                `Name: ${name}`,
                `Email: ${email}`,
                `Subject: ${subject}`,
                "",
                "Message:",
                message,
            ].join("\n"),
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json(
            {
                ok: false,
                error: "We could not send your message right now. Please try again shortly.",
            },
            { status: 500 },
        );
    }
}
