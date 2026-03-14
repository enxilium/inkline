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

const nativeConsole = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
};

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
        nativeConsole.info(`${prefix} ${message}`, ...args);
        return;
    }

    const method = levelToConsoleMethod[level];
    nativeConsole[method](`${prefix} ${message}`, ...args);
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

const CONSOLE_ERROR_PATCH_FLAG = "__inkline_console_error_patched__";

export const installTerminalErrorRedirection = (
    scope = "Console",
): void => {
    const globalState = globalThis as Record<string, unknown>;
    if (globalState[CONSOLE_ERROR_PATCH_FLAG]) {
        return;
    }

    const logger = createTerminalLogger(scope);
    globalState[CONSOLE_ERROR_PATCH_FLAG] = true;

    console.error = (...args: unknown[]): void => {
        if (args.length === 0) {
            logger.error("Unknown error");
            return;
        }

        const [first, ...rest] = args;
        if (typeof first === "string") {
            logger.error(first, ...rest);
            return;
        }

        logger.error("Unhandled error", first, ...rest);
    };
};
