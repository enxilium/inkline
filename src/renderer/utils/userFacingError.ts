export type UserErrorContext =
    | "auth-login"
    | "auth-register"
    | "auth-reset-password"
    | "generation-image"
    | "generation-audio"
    | "generation-playlist"
    | "analysis"
    | "setup-download"
    | "setup-extraction"
    | "settings-account"
    | "settings-model";

const includesAny = (value: string, needles: string[]): boolean =>
    needles.some((needle) => value.includes(needle));

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "";
};

const mapByContext = (
    normalizedMessage: string,
    context?: UserErrorContext,
): string | null => {
    if (context === "auth-login") {
        if (
            includesAny(normalizedMessage, [
                "invalid login credentials",
                "invalid password",
                "wrong password",
                "email not confirmed",
            ])
        ) {
            return "We couldn't sign you in. Check your email and password, or reset your password.";
        }
    }

    if (context === "auth-register") {
        if (
            includesAny(normalizedMessage, [
                "already registered",
                "already in use",
                "already exists",
            ])
        ) {
            return "That email is already registered. Sign in instead, or reset your password.";
        }

        if (normalizedMessage.includes("at least 6")) {
            return "Choose a stronger password with at least 6 characters.";
        }
    }

    if (context === "auth-reset-password") {
        if (
            includesAny(normalizedMessage, [
                "invalid email",
                "email not found",
                "user not found",
            ])
        ) {
            return "We couldn't send a reset link for that email. Check the address and try again.";
        }
    }

    if (context === "settings-model") {
        if (
            includesAny(normalizedMessage, [
                "api key",
                "invalid key",
                "unauthorized",
                "401",
            ])
        ) {
            return "The API key looks invalid or missing. Update it in Settings and try again.";
        }
    }

    if (context === "analysis") {
        if (includesAny(normalizedMessage, ["rate limit", "429"])) {
            return "You're sending requests too quickly right now. Wait a moment, then try again.";
        }

        if (
            includesAny(normalizedMessage, ["api key", "unauthorized", "401"])
        ) {
            return "AI analysis is unavailable because your API key is missing or invalid. Update it in Settings and try again.";
        }
    }

    if (
        context === "generation-image" ||
        context === "generation-audio" ||
        context === "generation-playlist"
    ) {
        if (includesAny(normalizedMessage, ["rate limit", "429"])) {
            return "Generation is temporarily rate-limited. Wait a moment and try again.";
        }

        if (
            includesAny(normalizedMessage, ["api key", "unauthorized", "401"])
        ) {
            return "Generation failed because your API key is missing or invalid. Update it in Settings and try again.";
        }

        if (
            includesAny(normalizedMessage, [
                "not initialized",
                "failed to start",
                "connection closed",
                "econnrefused",
            ])
        ) {
            return "The local generation service is unavailable right now. Retry in a few seconds.";
        }

        if (includesAny(normalizedMessage, ["timed out", "timeout"])) {
            return "Generation took too long. Try again.";
        }
    }

    if (context === "setup-download") {
        if (
            includesAny(normalizedMessage, [
                "enospc",
                "no space left",
                "disk full",
            ])
        ) {
            return "Not enough disk space for setup downloads. Free up space, then retry.";
        }

        if (includesAny(normalizedMessage, ["eacces", "permission denied"])) {
            return "Setup couldn't write files due to permissions. Run Inkline with sufficient permissions and retry.";
        }

        if (
            includesAny(normalizedMessage, [
                "network",
                "fetch failed",
                "enotfound",
                "econn",
            ])
        ) {
            return "Setup download failed because of a connection issue. Check your internet and retry.";
        }
    }

    if (context === "setup-extraction") {
        if (
            includesAny(normalizedMessage, [
                "7za exited",
                "7-zip",
                "extract",
                "archive",
            ])
        ) {
            return "Setup couldn't extract downloaded files. Re-run setup and ensure 7-Zip is available.";
        }
    }

    if (context === "settings-account") {
        if (
            includesAny(normalizedMessage, [
                "already in use",
                "already registered",
            ])
        ) {
            return "That email is already in use. Try another email address.";
        }
    }

    return null;
};

export const normalizeUserFacingError = (
    error: unknown,
    fallback: string,
    context?: UserErrorContext,
): string => {
    const rawMessage = getErrorMessage(error).replace(
        /^Error invoking remote method '[^']+':\s*/,
        "",
    );
    const normalizedMessage = rawMessage.toLowerCase();

    const contextMessage = mapByContext(normalizedMessage, context);
    if (contextMessage) {
        return contextMessage;
    }

    if (includesAny(normalizedMessage, ["rate limit", "429"])) {
        return "Too many requests right now. Wait a moment and try again.";
    }

    if (includesAny(normalizedMessage, ["api key", "unauthorized", "401"])) {
        return "This action requires a valid API key. Update it in Settings and try again.";
    }

    if (includesAny(normalizedMessage, ["timed out", "timeout"])) {
        return "The request took too long. Please try again.";
    }

    if (
        includesAny(normalizedMessage, [
            "network",
            "fetch failed",
            "econn",
            "enotfound",
        ])
    ) {
        return "Connection issue detected. Check your internet and try again.";
    }

    return rawMessage || fallback;
};
