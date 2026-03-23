/**
 * LanguageToolService
 *
 * Manages a self-hosted LanguageTool server with embedded Java runtime.
 * Implements ILanguageToolService to provide grammar checking via a local server.
 * All HTTP calls are made from the main process to avoid CORS.
 */

import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import portfinder from "portfinder";
import { EventEmitter } from "events";
import { createTerminalLogger } from "./TerminalLogger";
import { getRuntimeServerBasePath } from "./ServerRuntimePath";
import type {
    GrammarCheckRequest,
    ILanguageToolService,
    LanguageToolResponse,
} from "../../@core/domain/services/ILanguageToolService";

const logger = createTerminalLogger("LanguageToolService");

export class LanguageToolService
    extends EventEmitter
    implements ILanguageToolService
{
    private serverProcess: ChildProcess | null = null;
    private basePath = "";
    private serverReady: Promise<void>;
    private port: number | null = null;
    private apiUrl: string | null = null;

    // Port range for LanguageTool (separate from ComfyUI's 8188)
    private static readonly PORT_RANGE_START = 8091;
    private static readonly PORT_RANGE_END = 8099;

    private getJavaExecutableName(): string {
        return process.platform === "win32" ? "java.exe" : "java";
    }

    private getJavaCandidatePaths(): string[] {
        const basePath = getRuntimeServerBasePath();
        const javaExec = this.getJavaExecutableName();

        return [
            path.join(basePath, "java_embeded", "bin", javaExec),
            path.join(
                basePath,
                "java_embeded",
                "Contents",
                "Home",
                "bin",
                javaExec,
            ),
        ];
    }

    constructor() {
        super();
        this.serverReady = this.initializeServer();
    }

    /**
     * Get the base path for the LanguageTool server
     */
    private getServerPath(): string {
        return path.join(getRuntimeServerBasePath(), "language");
    }

    /**
     * Get the path to the embedded Java runtime
     */
    private getJavaPath(): string | null {
        const candidates = this.getJavaCandidatePaths();
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    private ensureJavaExecutable(javaPath: string): void {
        if (process.platform === "win32") {
            return;
        }

        try {
            fs.accessSync(javaPath, fs.constants.X_OK);
            return;
        } catch {
            // Continue to chmod fallback.
        }

        try {
            fs.chmodSync(javaPath, 0o755);
        } catch (error) {
            logger.warn("Failed to set execute permission on embedded Java", {
                javaPath,
                error,
            });
        }

        fs.accessSync(javaPath, fs.constants.X_OK);
    }

    /**
     * Check if the LanguageTool server is installed
     */
    isInstalled(): boolean {
        const serverJar = path.join(
            this.getServerPath(),
            "languagetool-server.jar",
        );
        const javaPath = this.getJavaPath();

        return javaPath !== null && fs.existsSync(serverJar);
    }

    /**
     * Initialize and start the LanguageTool server
     */
    private async initializeServer(): Promise<void> {
        // Check if installed
        if (!this.isInstalled()) {
            logger.warn(
                "LanguageTool or Java not installed. Local LanguageTool is unavailable until setup completes.",
            );
            return;
        }

        try {
            this.basePath = this.getServerPath();
            const javaPath = this.getJavaPath();
            if (!javaPath) {
                logger.warn("Embedded Java executable not found.");
                return;
            }
            this.ensureJavaExecutable(javaPath);
            const serverJar = path.join(
                this.basePath,
                "languagetool-server.jar",
            );
            const serverProperties = path.join(
                this.basePath,
                "server.properties",
            );

            // Find available port in the designated range
            const startPort =
                LanguageToolService.PORT_RANGE_START +
                Math.floor(
                    Math.random() *
                        (LanguageToolService.PORT_RANGE_END -
                            LanguageToolService.PORT_RANGE_START),
                );
            this.port = await portfinder.getPortPromise({
                port: startPort,
                stopPort: LanguageToolService.PORT_RANGE_END + 10, // Allow some overflow
            });

            logger.info(`Starting LanguageTool on port ${this.port}`);

            // Build command arguments - use -jar to run the server JAR directly
            const args = ["-jar", serverJar, "--port", this.port.toString()];

            // Add config file if it exists
            if (fs.existsSync(serverProperties)) {
                args.push("--config", serverProperties);
            }

            // Start server process
            this.serverProcess = spawn(javaPath, args, {
                cwd: this.basePath,
                stdio: ["ignore", "pipe", "pipe"],
                windowsHide: true,
            });

            this.serverProcess.stderr?.on("data", (data) => {
                const lines = data
                    .toString()
                    .split(/\r?\n/)
                    .map((line: string) => line.trim())
                    .filter(Boolean);

                for (const line of lines) {
                    if (/\b(error|exception|severe)\b/i.test(line)) {
                        logger.error(line);
                    } else if (/\bwarn\b/i.test(line)) {
                        logger.warn(line);
                    }
                }
            });

            this.serverProcess.on("error", (err) => {
                logger.error("Failed to start server", err);
            });

            this.serverProcess.on("exit", (code) => {
                if (code === 0 || code === null) {
                    logger.info(`Server exited with code ${code}`);
                } else {
                    logger.warn(`Server exited with code ${code}`);
                }
                this.serverProcess = null;
            });

            // Wait for server to be ready
            await this.waitForServer(this.port);

            this.apiUrl = `http://127.0.0.1:${this.port}/v2/check`;
            logger.success(`Server ready at ${this.apiUrl}`);
        } catch (error) {
            logger.error("Initialization failed", error);
            this.apiUrl = null;
        }
    }

    /**
     * Wait for the server to become available
     */
    private async waitForServer(port: number, retries = 60): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(
                    `http://127.0.0.1:${port}/v2/languages`,
                );
                if (response.ok) {
                    return;
                }
            } catch {
                // Connection refused, server not ready yet
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
        }
        throw new Error("LanguageTool server failed to start within timeout");
    }

    /**
     * Wait for the service to be ready
     */
    async waitForReady(): Promise<void> {
        return this.serverReady;
    }

    /**
     * Get the API URL for the local server.
     */
    private getApiUrl(): string {
        if (!this.apiUrl) {
            throw new Error("LanguageTool local server is not available");
        }
        return this.apiUrl;
    }

    /**
     * Check text for grammar and spelling issues.
     * Makes HTTP request from main process to avoid CORS issues.
     */
    async checkGrammar(
        request: GrammarCheckRequest,
    ): Promise<LanguageToolResponse> {
        try {
            const url = this.getApiUrl();
            const body = new URLSearchParams({
                text: request.text,
                language: request.language,
            });

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Accept: "application/json",
                },
                body: body.toString(),
            });

            if (!response.ok) {
                throw new Error(
                    `LanguageTool API error: ${response.status} ${response.statusText}`,
                );
            }

            const data = (await response.json()) as LanguageToolResponse;
            return data;
        } catch (error) {
            logger.error("Grammar check failed", error);

            // Return empty response on failure
            return {
                language: {
                    name: "Unknown",
                    code: request.language,
                },
                matches: [],
            };
        }
    }

    /**
     * Check if using local server
     */
    isUsingLocalServer(): boolean {
        return this.apiUrl !== null;
    }

    /**
     * Get server port (null when server is unavailable)
     */
    getPort(): number | null {
        return this.port;
    }

    /**
     * Shutdown the server gracefully
     */
    async shutdown(): Promise<void> {
        if (this.serverProcess) {
            logger.info("Shutting down server");
            this.serverProcess.kill("SIGTERM");

            // Wait for process to exit
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.serverProcess) {
                        this.serverProcess.kill("SIGKILL");
                    }
                    resolve();
                }, 5000);

                this.serverProcess?.on("exit", () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            this.serverProcess = null;
            logger.success("Server shutdown complete");
        }
    }

    /**
     * Restart the server
     */
    async restart(): Promise<void> {
        await this.shutdown();
        this.serverReady = this.initializeServer();
        await this.serverReady;
    }
}

// Singleton instance
export const languageToolService = new LanguageToolService();
