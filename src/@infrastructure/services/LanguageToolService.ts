/**
 * LanguageToolService
 *
 * Manages a self-hosted LanguageTool server with embedded Java runtime.
 * Implements ILanguageToolService to provide grammar checking via local server
 * or public API fallback. All HTTP calls are made from the main process to avoid CORS.
 */

import { app } from "electron";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as path from "path";
import portfinder from "portfinder";
import { EventEmitter } from "events";
import type {
    GrammarCheckRequest,
    ILanguageToolService,
    LanguageToolResponse,
} from "../../@core/domain/services/ILanguageToolService";

export class LanguageToolService
    extends EventEmitter
    implements ILanguageToolService
{
    private serverProcess: ChildProcess | null = null;
    private basePath = "";
    private serverReady: Promise<void>;
    private port: number | null = null;
    private apiUrl: string | null = null;

    // Public API fallback URL
    private static readonly PUBLIC_API_URL =
        "https://api.languagetool.org/v2/check";

    // Port range for LanguageTool (separate from ComfyUI's 8188)
    private static readonly PORT_RANGE_START = 8091;
    private static readonly PORT_RANGE_END = 8099;

    constructor() {
        super();
        this.serverReady = this.initializeServer();
    }

    /**
     * Get the base path for the LanguageTool server
     */
    private getServerPath(): string {
        if (app.isPackaged) {
            return path.join(process.resourcesPath, "server", "language");
        }
        return path.join(app.getAppPath(), "server", "language");
    }

    /**
     * Get the path to the embedded Java runtime
     */
    private getJavaPath(): string {
        const basePath = app.isPackaged
            ? path.join(process.resourcesPath, "server")
            : path.join(app.getAppPath(), "server");
        return path.join(basePath, "java_embeded", "bin", "java.exe");
    }

    /**
     * Check if the LanguageTool server is installed
     */
    isInstalled(): boolean {
        const serverJar = path.join(
            this.getServerPath(),
            "languagetool-server.jar"
        );
        const javaPath = this.getJavaPath();

        return fs.existsSync(serverJar) && fs.existsSync(javaPath);
    }

    /**
     * Initialize and start the LanguageTool server
     */
    private async initializeServer(): Promise<void> {
        // Only run on Windows for now (like ComfyUI)
        if (process.platform !== "win32") {
            console.warn(
                "[LanguageToolService] Local LanguageTool server is only supported on Windows. Using public API."
            );
            this.apiUrl = LanguageToolService.PUBLIC_API_URL;
            return;
        }

        // Check if installed
        if (!this.isInstalled()) {
            console.warn(
                "[LanguageToolService] LanguageTool or Java not installed. Using public API until setup is completed."
            );
            this.apiUrl = LanguageToolService.PUBLIC_API_URL;
            return;
        }

        try {
            this.basePath = this.getServerPath();
            const javaPath = this.getJavaPath();
            const serverJar = path.join(
                this.basePath,
                "languagetool-server.jar"
            );
            const serverProperties = path.join(
                this.basePath,
                "server.properties"
            );

            // Find available port in the designated range
            const startPort =
                LanguageToolService.PORT_RANGE_START +
                Math.floor(
                    Math.random() *
                        (LanguageToolService.PORT_RANGE_END -
                            LanguageToolService.PORT_RANGE_START)
                );
            this.port = await portfinder.getPortPromise({
                port: startPort,
                stopPort: LanguageToolService.PORT_RANGE_END + 10, // Allow some overflow
            });

            console.log(
                `[LanguageToolService] Starting LanguageTool on port ${this.port}...`
            );

            // Build command arguments - use -jar to run the server JAR directly
            const args = ["-jar", serverJar, "--port", this.port.toString()];

            // Add config file if it exists
            if (fs.existsSync(serverProperties)) {
                args.push("--config", serverProperties);
            }

            // Allow requests from any origin (for Electron)
            args.push("--allow-origin", "*");

            // Start server process
            this.serverProcess = spawn(javaPath, args, {
                cwd: this.basePath,
                stdio: ["ignore", "pipe", "pipe"],
                windowsHide: true,
            });

            // Log output for debugging
            this.serverProcess.stdout?.on("data", (data) => {
                console.log(`[LanguageToolService] ${data.toString().trim()}`);
            });

            this.serverProcess.stderr?.on("data", (data) => {
                console.error(
                    `[LanguageToolService] Error: ${data.toString().trim()}`
                );
            });

            this.serverProcess.on("error", (err) => {
                console.error(
                    "[LanguageToolService] Failed to start server:",
                    err
                );
                // Fall back to public API
                this.apiUrl = LanguageToolService.PUBLIC_API_URL;
            });

            this.serverProcess.on("exit", (code) => {
                console.log(
                    `[LanguageToolService] Server exited with code ${code}`
                );
                this.serverProcess = null;
            });

            // Wait for server to be ready
            await this.waitForServer(this.port);

            this.apiUrl = `http://127.0.0.1:${this.port}/v2/check`;
            console.log(`[LanguageToolService] Server ready at ${this.apiUrl}`);
        } catch (error) {
            console.error(
                "[LanguageToolService] Initialization failed:",
                error
            );
            // Fall back to public API
            this.apiUrl = LanguageToolService.PUBLIC_API_URL;
        }
    }

    /**
     * Wait for the server to become available
     */
    private async waitForServer(port: number, retries = 60): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(
                    `http://127.0.0.1:${port}/v2/languages`
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
     * Get the API URL (local or public depending on availability)
     */
    private getApiUrl(): string {
        return this.apiUrl || LanguageToolService.PUBLIC_API_URL;
    }

    /**
     * Check text for grammar and spelling issues.
     * Makes HTTP request from main process to avoid CORS issues.
     */
    async checkGrammar(
        request: GrammarCheckRequest
    ): Promise<LanguageToolResponse> {
        const url = this.getApiUrl();

        try {
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
                    `LanguageTool API error: ${response.status} ${response.statusText}`
                );
            }

            const data = (await response.json()) as LanguageToolResponse;
            return data;
        } catch (error) {
            console.error("[LanguageToolService] Grammar check failed:", error);

            // If local server failed, try public API as fallback
            if (this.isUsingLocalServer()) {
                console.log(
                    "[LanguageToolService] Falling back to public API..."
                );
                try {
                    const body = new URLSearchParams({
                        text: request.text,
                        language: request.language,
                    });

                    const response = await fetch(
                        LanguageToolService.PUBLIC_API_URL,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type":
                                    "application/x-www-form-urlencoded",
                                Accept: "application/json",
                            },
                            body: body.toString(),
                        }
                    );

                    if (!response.ok) {
                        throw new Error(
                            `LanguageTool API error: ${response.status}`
                        );
                    }

                    return (await response.json()) as LanguageToolResponse;
                } catch (fallbackError) {
                    console.error(
                        "[LanguageToolService] Fallback also failed:",
                        fallbackError
                    );
                }
            }

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
        return (
            this.apiUrl !== null &&
            this.apiUrl !== LanguageToolService.PUBLIC_API_URL
        );
    }

    /**
     * Get server port (null if using public API)
     */
    getPort(): number | null {
        return this.port;
    }

    /**
     * Shutdown the server gracefully
     */
    async shutdown(): Promise<void> {
        if (this.serverProcess) {
            console.log("[LanguageToolService] Shutting down server...");
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
            console.log("[LanguageToolService] Server shutdown complete.");
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
