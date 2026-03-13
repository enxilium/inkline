type LogLevel = "debug" | "info" | "success" | "warn" | "error";

type TerminalLogger = {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    success: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
};

const supportsColor =
    Boolean(process.stdout?.isTTY) &&
    process.env.NO_COLOR !== "1" &&
    process.env.NO_COLOR !== "true";

const DEBUG_ENABLED =
    process.env.INKLINE_DEBUG_LOGS === "1" ||
    process.env.INKLINE_DEBUG_LOGS === "true" ||
    process.env.NODE_ENV === "development";

const COLORS: Record<LogLevel, string> = {
    debug: "\u001b[36m",
    info: "\u001b[34m",
    success: "\u001b[32m",
    warn: "\u001b[33m",
    error: "\u001b[31m",
};

const RESET = "\u001b[0m";

const levelToConsoleMethod: Record<
    Exclude<LogLevel, "success">,
    "debug" | "info" | "warn" | "error"
> = {
    debug: "debug",
    info: "info",
    warn: "warn",
    error: "error",
};

const formatPrefix = (scope: string, level: LogLevel): string => {
    const prefix = `[${scope}]`;
    if (!supportsColor) {
        return prefix;
    }

    return `${COLORS[level]}${prefix}${RESET}`;
};

const emit = (
    scope: string,
    level: LogLevel,
    message: string,
    args: unknown[],
): void => {
    if (level === "debug" && !DEBUG_ENABLED) {
        return;
    }

    const prefix = formatPrefix(scope, level);
    if (level === "success") {
        console.info(`${prefix} ${message}`, ...args);
        return;
    }

    const method = levelToConsoleMethod[level];
    console[method](`${prefix} ${message}`, ...args);
};

export const createTerminalLogger = (scope: string): TerminalLogger => ({
    debug: (message: string, ...args: unknown[]) => {
        emit(scope, "debug", message, args);
    },
    info: (message: string, ...args: unknown[]) => {
        emit(scope, "info", message, args);
    },
    success: (message: string, ...args: unknown[]) => {
        emit(scope, "success", message, args);
    },
    warn: (message: string, ...args: unknown[]) => {
        emit(scope, "warn", message, args);
    },
    error: (message: string, ...args: unknown[]) => {
        emit(scope, "error", message, args);
    },
});
