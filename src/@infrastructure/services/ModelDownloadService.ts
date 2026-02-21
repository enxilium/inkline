/* eslint-disable @typescript-eslint/no-empty-function */
import { app } from "electron";
import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import * as https from "https";
import * as http from "http";
import { spawn } from "child_process";
import { EventEmitter } from "events";

export interface DownloadProgress {
    downloadType: "comfyui" | "image" | "audio" | "languagetool";
    downloadedBytes: number;
    totalBytes: number;
    percentage: number;
    status: "pending" | "downloading" | "extracting" | "completed" | "error";
    error?: string;
}

export interface ModelInfo {
    type: "image" | "audio";
    url: string;
    filename: string;
    subfolder: string;
}

// ComfyUI portable download URL
const COMFYUI_DOWNLOAD_URL =
    "https://github.com/comfyanonymous/ComfyUI/releases/latest/download/ComfyUI_windows_portable_nvidia.7z";

// LanguageTool download URLs
const LANGUAGETOOL_SERVER_URL =
    "https://internal1.languagetool.org/snapshots/LanguageTool-latest-snapshot.zip";
const JAVA_JRE_URL =
    "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jre_x64_windows_hotspot_21.0.5_11.zip";

export const MODELS: Record<string, ModelInfo> = {
    image: {
        type: "image",
        url: "https://huggingface.co/duongve/NetaYume-Lumina-Image-2.0/resolve/main/NetaYumev35_pretrained_all_in_one.safetensors",
        filename: "NetaYumev35_pretrained_all_in_one.safetensors",
        subfolder: "checkpoints",
    },
    audio: {
        type: "audio",
        url: "https://huggingface.co/Comfy-Org/ACE-Step_ComfyUI_repackaged/resolve/main/all_in_one/ace_step_v1_3.5b.safetensors",
        filename: "ace_step_v1_3.5b.safetensors",
        subfolder: "checkpoints",
    },
};

// Workflow files that should be preserved/restored after extraction
const WORKFLOW_FILES = ["txt2audio.json", "txt2image.json"];

export class ModelDownloadService extends EventEmitter {
    private serverBasePath: string;
    private modelsBasePath: string;
    private activeDownloads: Map<string, { abort: () => void }> = new Map();
    // Track paths that need cleanup on cancel (temp files, archives, extraction dirs)
    private cleanupPaths: Map<string, string[]> = new Map();
    // Track active extraction processes for cancellation
    private activeExtractions: Map<string, { kill: () => void }> = new Map();

    constructor() {
        super();
        this.serverBasePath = this.getServerPath();
        this.modelsBasePath = path.join(
            this.serverBasePath,
            "ComfyUI",
            "models",
        );
    }

    private getServerPath(): string {
        if (app.isPackaged) {
            return path.join(process.resourcesPath, "server");
        }
        return path.join(app.getAppPath(), "server");
    }

    /**
     * Check if ComfyUI server is already installed
     */
    async isComfyUIInstalled(): Promise<boolean> {
        const pythonPath = path.join(
            this.serverBasePath,
            "python_embeded",
            "python.exe",
        );
        const mainScript = path.join(this.serverBasePath, "ComfyUI", "main.py");

        try {
            await fsPromises.access(pythonPath);
            await fsPromises.access(mainScript);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if LanguageTool server is already installed (both Java and LanguageTool)
     */
    async isLanguageToolInstalled(): Promise<boolean> {
        const javaPath = path.join(
            this.serverBasePath,
            "java_embeded",
            "bin",
            "java.exe",
        );
        const serverJar = path.join(
            this.serverBasePath,
            "language",
            "languagetool-server.jar",
        );

        try {
            await fsPromises.access(javaPath);
            await fsPromises.access(serverJar);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Check if a model is already downloaded
     */
    async isModelDownloaded(modelType: "image" | "audio"): Promise<boolean> {
        const model = MODELS[modelType];
        const modelPath = path.join(
            this.modelsBasePath,
            model.subfolder,
            model.filename,
        );

        try {
            const stats = await fsPromises.stat(modelPath);
            // Check if file is reasonably sized (at least 1GB for these models)
            return stats.size > 1024 * 1024 * 1024;
        } catch {
            return false;
        }
    }

    /**
     * Get the path to bundled workflow files (shipped with the app)
     */
    private getBundledWorkflowsPath(): string {
        if (app.isPackaged) {
            return path.join(process.resourcesPath, "workflows");
        }
        return path.join(app.getAppPath(), "assets", "workflows");
    }

    /**
     * Download and extract ComfyUI portable
     */
    async downloadComfyUI(
        onProgress: (progress: DownloadProgress) => void,
    ): Promise<void> {
        // Check if already installed
        const installed = await this.isComfyUIInstalled();
        if (installed) {
            onProgress({
                downloadType: "comfyui",
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 100,
                status: "completed",
            });
            return;
        }

        // Ensure server directory exists
        await fsPromises.mkdir(this.serverBasePath, { recursive: true });

        const archivePath = path.join(
            this.serverBasePath,
            "ComfyUI_portable.7z",
        );
        const extractedDir = path.join(
            this.serverBasePath,
            "ComfyUI_windows_portable",
        );

        // Track paths for cleanup on cancel
        this.cleanupPaths.set("comfyui", [
            archivePath,
            archivePath + ".download",
            extractedDir,
        ]);

        // Download the 7z archive
        await this.downloadFile(
            COMFYUI_DOWNLOAD_URL,
            archivePath,
            "comfyui",
            onProgress,
        );

        // Extract the archive
        onProgress({
            downloadType: "comfyui",
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 0,
            status: "extracting",
        });

        await this.extract7z(archivePath, this.serverBasePath, onProgress);

        // The archive extracts to a subfolder like "ComfyUI_windows_portable"
        // We need to move contents up one level
        try {
            const extractedExists = await fsPromises
                .access(extractedDir)
                .then(() => true)
                .catch(() => false);

            if (extractedExists) {
                // Move contents from extracted folder to server folder
                const entries = await fsPromises.readdir(extractedDir, {
                    withFileTypes: true,
                });

                for (const entry of entries) {
                    const srcPath = path.join(extractedDir, entry.name);
                    const destPath = path.join(this.serverBasePath, entry.name);

                    // Skip if destination already exists (preserve existing files)
                    try {
                        await fsPromises.access(destPath);
                        // If it's a directory, we might need to merge
                        if (entry.isDirectory()) {
                            await this.mergeDirectories(srcPath, destPath);
                        }
                    } catch {
                        // Destination doesn't exist, move it
                        await fsPromises.rename(srcPath, destPath);
                    }
                }

                // Remove the now-empty extracted directory
                await fsPromises.rm(extractedDir, {
                    recursive: true,
                    force: true,
                });
            }
        } catch (err) {
            console.warn(
                "[ModelDownloadService] Error reorganizing extracted files:",
                err,
            );
        }

        // Clean up the archive
        await fsPromises.unlink(archivePath).catch(() => {});

        // Copy bundled workflow files to server directory
        await this.copyBundledWorkflows();

        // Clear cleanup tracking on success
        this.cleanupPaths.delete("comfyui");

        onProgress({
            downloadType: "comfyui",
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 100,
            status: "completed",
        });
    }

    /**
     * Copy bundled workflow files to the server directory
     */
    private async copyBundledWorkflows(): Promise<void> {
        const bundledPath = this.getBundledWorkflowsPath();

        for (const file of WORKFLOW_FILES) {
            const srcPath = path.join(bundledPath, file);
            const destPath = path.join(this.serverBasePath, file);

            try {
                await fsPromises.access(srcPath);
                await fsPromises.copyFile(srcPath, destPath);
                console.log(`[ModelDownloadService] Copied workflow: ${file}`);
            } catch (err) {
                console.warn(
                    `[ModelDownloadService] Could not copy workflow ${file}:`,
                    err,
                );
            }
        }
    }

    /**
     * Merge source directory into destination, preserving existing files
     */
    private async mergeDirectories(src: string, dest: string): Promise<void> {
        const entries = await fsPromises.readdir(src, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);

            try {
                await fsPromises.access(destPath);
                // Destination exists
                if (entry.isDirectory()) {
                    await this.mergeDirectories(srcPath, destPath);
                }
                // If it's a file and already exists, skip (preserve existing)
            } catch {
                // Destination doesn't exist, move it
                await fsPromises.rename(srcPath, destPath);
            }
        }
    }

    /**
     * Extract a 7z archive using system 7z
     */
    private async extract7z(
        archivePath: string,
        destPath: string,
        onProgress: (progress: DownloadProgress) => void,
        downloadType: "comfyui" | "languagetool" = "comfyui",
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            // Use single-quoted PowerShell strings so backslashes are literal
            // (PowerShell only treats backtick as escape, not backslash).
            const safeArchive = archivePath.replace(/'/g, "''");
            const safeDest = destPath.replace(/'/g, "''");

            // Build 7z search paths outside the template to avoid JS template
            // literal interpreting PowerShell ${} syntax.
            const pf86 = "${env:ProgramFiles(x86)}";
            const psScript = `
                $archivePath = '${safeArchive}'
                $destPath = '${safeDest}'
                
                # Try to find 7z executable
                $7zExe = $null
                
                # Check common locations
                $locations = @(
                    (Join-Path (Join-Path $env:ProgramFiles '7-Zip') '7z.exe'),
                    (Join-Path (Join-Path ${pf86} '7-Zip') '7z.exe')
                )
                
                foreach ($loc in $locations) {
                    if (Test-Path $loc) {
                        $7zExe = $loc
                        break
                    }
                }
                
                # Check PATH
                if (-not $7zExe) {
                    $7zExe = (Get-Command 7z -ErrorAction SilentlyContinue).Source
                }
                
                if ($7zExe) {
                    & $7zExe x $archivePath ('-o' + $destPath) -y
                    exit $LASTEXITCODE
                } else {
                    Write-Error '7-Zip not found. Please install 7-Zip from https://7-zip.org to continue.'
                    exit 1
                }
            `;

            const ps = spawn("powershell.exe", [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                psScript,
            ]);

            // Track this extraction process for cancellation
            this.activeExtractions.set(downloadType, {
                kill: () => {
                    try {
                        ps.kill();
                    } catch {
                        // Process may already be dead
                    }
                },
            });

            let stdout = "";
            let stderr = "";

            ps.stdout?.on("data", (data) => {
                stdout += data.toString();
                // Try to parse progress from 7z output
                const match = data.toString().match(/(\d+)%/);
                if (match) {
                    onProgress({
                        downloadType: "comfyui",
                        downloadedBytes: 0,
                        totalBytes: 0,
                        percentage: parseInt(match[1], 10),
                        status: "extracting",
                    });
                }
            });

            ps.stderr?.on("data", (data) => {
                stderr += data.toString();
            });

            ps.on("close", (code) => {
                this.activeExtractions.delete(downloadType);
                if (code === 0) {
                    resolve();
                } else if (code === null) {
                    // Process was killed (cancelled)
                    reject(new Error("Extraction cancelled"));
                } else {
                    reject(
                        new Error(
                            `7z extraction failed (code ${code}): ${stderr || stdout}`,
                        ),
                    );
                }
            });

            ps.on("error", (err) => {
                this.activeExtractions.delete(downloadType);
                reject(new Error(`Failed to run extraction: ${err.message}`));
            });
        });
    }

    /**
     * Generic file download with progress tracking
     */
    private async downloadFile(
        url: string,
        destPath: string,
        downloadType: "comfyui" | "image" | "audio" | "languagetool",
        onProgress: (progress: DownloadProgress) => void,
    ): Promise<void> {
        const tempPath = destPath + ".download";

        return new Promise((resolve, reject) => {
            let aborted = false;

            const abortController = {
                abort: () => {
                    aborted = true;
                },
            };

            this.activeDownloads.set(downloadType, abortController);

            const progress: DownloadProgress = {
                downloadType,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 0,
                status: "downloading",
            };

            const downloadWithRedirect = (
                currentUrl: string,
                redirectCount = 0,
            ) => {
                if (redirectCount > 10) {
                    progress.status = "error";
                    progress.error = "Too many redirects";
                    onProgress(progress);
                    reject(new Error("Too many redirects"));
                    return;
                }

                const protocol = currentUrl.startsWith("https") ? https : http;

                const request = protocol.get(
                    currentUrl,
                    { timeout: 60000 },
                    (response) => {
                        // Handle redirects
                        if (
                            response.statusCode &&
                            response.statusCode >= 300 &&
                            response.statusCode < 400 &&
                            response.headers.location
                        ) {
                            response.destroy();
                            downloadWithRedirect(
                                response.headers.location,
                                redirectCount + 1,
                            );
                            return;
                        }

                        if (response.statusCode !== 200) {
                            progress.status = "error";
                            progress.error = `HTTP ${response.statusCode}`;
                            onProgress(progress);
                            reject(
                                new Error(
                                    `Failed to download: HTTP ${response.statusCode}`,
                                ),
                            );
                            return;
                        }

                        const totalBytes = parseInt(
                            response.headers["content-length"] || "0",
                            10,
                        );
                        progress.totalBytes = totalBytes;

                        const fileStream = fs.createWriteStream(tempPath);
                        let streamClosed = false;

                        const closeAndCleanup = () => {
                            if (streamClosed) return;
                            streamClosed = true;
                            response.unpipe(fileStream);
                            response.destroy();
                            fileStream.destroy();
                            fsPromises.unlink(tempPath).catch(() => {});
                        };

                        response.on("data", (chunk: Buffer) => {
                            if (aborted) {
                                closeAndCleanup();
                                return;
                            }

                            progress.downloadedBytes += chunk.length;
                            progress.percentage = totalBytes
                                ? Math.round(
                                      (progress.downloadedBytes / totalBytes) *
                                          100,
                                  )
                                : 0;
                            onProgress(progress);
                        });

                        response.pipe(fileStream);

                        fileStream.on("finish", async () => {
                            if (streamClosed) return;
                            fileStream.close();

                            if (aborted) {
                                await fsPromises
                                    .unlink(tempPath)
                                    .catch(() => {});
                                reject(new Error("Download cancelled"));
                                return;
                            }

                            try {
                                await fsPromises.rename(tempPath, destPath);
                                this.activeDownloads.delete(downloadType);
                                resolve();
                            } catch (err) {
                                progress.status = "error";
                                progress.error = "Failed to save file";
                                onProgress(progress);
                                reject(err);
                            }
                        });

                        fileStream.on("error", async (err) => {
                            if (streamClosed || aborted) return;
                            await fsPromises.unlink(tempPath).catch(() => {});
                            progress.status = "error";
                            progress.error = err.message;
                            onProgress(progress);
                            reject(err);
                        });

                        fileStream.on("close", () => {
                            if (aborted && !streamClosed) {
                                reject(new Error("Download cancelled"));
                            }
                        });
                    },
                );

                request.on("error", (err: Error) => {
                    progress.status = "error";
                    progress.error = err.message;
                    onProgress(progress);
                    reject(err);
                });

                request.on("timeout", () => {
                    request.destroy();
                    progress.status = "error";
                    progress.error = "Connection timeout";
                    onProgress(progress);
                    reject(new Error("Connection timeout"));
                });
            };

            downloadWithRedirect(url);
        });
    }

    /**
     * Download a model file
     */
    async downloadModel(
        modelType: "image" | "audio",
        onProgress: (progress: DownloadProgress) => void,
    ): Promise<void> {
        const model = MODELS[modelType];
        const modelDir = path.join(this.modelsBasePath, model.subfolder);
        const modelPath = path.join(modelDir, model.filename);

        // Track paths for cleanup on cancel
        this.cleanupPaths.set(modelType, [modelPath, modelPath + ".download"]);

        // Ensure directory exists
        await fsPromises.mkdir(modelDir, { recursive: true });

        // Check if already downloaded before starting
        const alreadyDownloaded = await this.isModelDownloaded(modelType);
        if (alreadyDownloaded) {
            onProgress({
                downloadType: modelType,
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 100,
                status: "completed",
            });
            return;
        }

        await this.downloadFile(model.url, modelPath, modelType, onProgress);

        // Clear cleanup tracking on success
        this.cleanupPaths.delete(modelType);

        onProgress({
            downloadType: modelType,
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 100,
            status: "completed",
        });
    }

    /**
     * Download and install LanguageTool server with embedded Java JRE
     */
    async downloadLanguageTool(
        onProgress: (progress: DownloadProgress) => void,
    ): Promise<void> {
        // Check if already installed
        const installed = await this.isLanguageToolInstalled();
        if (installed) {
            onProgress({
                downloadType: "languagetool",
                downloadedBytes: 0,
                totalBytes: 0,
                percentage: 100,
                status: "completed",
            });
            return;
        }

        // Ensure server directory exists
        await fsPromises.mkdir(this.serverBasePath, { recursive: true });

        // Track paths for cleanup on cancel
        const jreZipPath = path.join(this.serverBasePath, "java_jre.zip");
        const ltZipPath = path.join(this.serverBasePath, "languagetool.zip");
        this.cleanupPaths.set("languagetool", [
            jreZipPath,
            jreZipPath + ".download",
            ltZipPath,
            ltZipPath + ".download",
            // Extracted dirs will be added dynamically when found
        ]);

        // Step 1: Download and extract Java JRE
        console.log("[ModelDownloadService] Downloading Java JRE...");

        await this.downloadFile(
            JAVA_JRE_URL,
            jreZipPath,
            "languagetool",
            (progress) => {
                // Scale to 0-40% for JRE download
                onProgress({
                    ...progress,
                    percentage: Math.round(progress.percentage * 0.4),
                });
            },
        );

        // Extract Java JRE
        onProgress({
            downloadType: "languagetool",
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 40,
            status: "extracting",
        });

        await this.extractZip(jreZipPath, this.serverBasePath);

        // Rename extracted JRE folder to java_embeded
        // The Adoptium zip extracts to something like "jdk-21.0.5+11-jre"
        const jreExtractedDir = await this.findExtractedDir(
            this.serverBasePath,
            /^jdk-.*-jre$/,
        );
        if (jreExtractedDir) {
            // Track extracted dir for cleanup
            const currentPaths = this.cleanupPaths.get("languagetool") || [];
            currentPaths.push(jreExtractedDir);
            this.cleanupPaths.set("languagetool", currentPaths);

            const javaEmbededPath = path.join(
                this.serverBasePath,
                "java_embeded",
            );
            // Remove existing if present
            await fsPromises.rm(javaEmbededPath, {
                recursive: true,
                force: true,
            });
            await fsPromises.rename(jreExtractedDir, javaEmbededPath);
        }

        // Clean up JRE zip
        await fsPromises.unlink(jreZipPath).catch(() => {});

        // Step 2: Download and extract LanguageTool
        console.log(
            "[ModelDownloadService] Downloading LanguageTool server...",
        );

        await this.downloadFile(
            LANGUAGETOOL_SERVER_URL,
            ltZipPath,
            "languagetool",
            (progress) => {
                // Scale to 40-90% for LanguageTool download
                onProgress({
                    ...progress,
                    percentage: 40 + Math.round(progress.percentage * 0.5),
                });
            },
        );

        // Extract LanguageTool
        onProgress({
            downloadType: "languagetool",
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 90,
            status: "extracting",
        });

        await this.extractZip(ltZipPath, this.serverBasePath);

        // Rename extracted LanguageTool folder to "language"
        // The zip extracts to something like "LanguageTool-6.6-SNAPSHOT"
        const ltExtractedDir = await this.findExtractedDir(
            this.serverBasePath,
            /^LanguageTool-/,
        );
        if (ltExtractedDir) {
            // Track extracted dir for cleanup
            const currentPaths = this.cleanupPaths.get("languagetool") || [];
            currentPaths.push(ltExtractedDir);
            this.cleanupPaths.set("languagetool", currentPaths);

            const languagePath = path.join(this.serverBasePath, "language");
            // Remove existing if present
            await fsPromises.rm(languagePath, { recursive: true, force: true });
            await fsPromises.rename(ltExtractedDir, languagePath);
        }

        // Clean up LanguageTool zip
        await fsPromises.unlink(ltZipPath).catch(() => {});

        // Clear cleanup tracking on success
        this.cleanupPaths.delete("languagetool");

        onProgress({
            downloadType: "languagetool",
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 100,
            status: "completed",
        });

        console.log(
            "[ModelDownloadService] LanguageTool installation complete.",
        );
    }

    /**
     * Find an extracted directory matching a pattern
     */
    private async findExtractedDir(
        basePath: string,
        pattern: RegExp,
    ): Promise<string | null> {
        try {
            const entries = await fsPromises.readdir(basePath, {
                withFileTypes: true,
            });
            for (const entry of entries) {
                if (entry.isDirectory() && pattern.test(entry.name)) {
                    return path.join(basePath, entry.name);
                }
            }
        } catch {
            // Ignore errors
        }
        return null;
    }

    /**
     * Extract a ZIP archive using PowerShell's Expand-Archive
     */
    private async extractZip(
        archivePath: string,
        destPath: string,
        downloadType: "comfyui" | "languagetool" = "languagetool",
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const safeArchive = archivePath.replace(/'/g, "''");
            const safeDest = destPath.replace(/'/g, "''");

            const psScript = `
                Expand-Archive -Path '${safeArchive}' -DestinationPath '${safeDest}' -Force
            `;

            const ps = spawn("powershell.exe", [
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-Command",
                psScript,
            ]);

            // Track this extraction process for cancellation
            this.activeExtractions.set(downloadType, {
                kill: () => {
                    try {
                        ps.kill();
                    } catch {
                        // Process may already be dead
                    }
                },
            });

            let stderr = "";

            ps.stderr?.on("data", (data) => {
                stderr += data.toString();
            });

            ps.on("close", (code) => {
                this.activeExtractions.delete(downloadType);
                if (code === 0) {
                    resolve();
                } else if (code === null) {
                    // Process was killed (cancelled)
                    reject(new Error("Extraction cancelled"));
                } else {
                    reject(
                        new Error(
                            `ZIP extraction failed (code ${code}): ${stderr}`,
                        ),
                    );
                }
            });

            ps.on("error", (err) => {
                this.activeExtractions.delete(downloadType);
                reject(new Error(`Failed to run extraction: ${err.message}`));
            });
        });
    }

    /**
     * Delete ComfyUI installation (python_embeded, ComfyUI folder, workflow files)
     */
    async deleteComfyUI(): Promise<void> {
        // Directories created by the ComfyUI portable archive
        const comfyDirs = ["python_embeded", "ComfyUI", "advanced", "update"];

        // Loose files created by the ComfyUI portable archive
        const comfyFiles = [
            "run_cpu.bat",
            "run_nvidia_gpu.bat",
            "run_nvidia_gpu_fast_fp16_accumulation.bat",
            "README_VERY_IMPORTANT.txt",
            ...WORKFLOW_FILES,
        ];

        for (const name of comfyDirs) {
            const dirPath = path.join(this.serverBasePath, name);
            try {
                const stats = await fsPromises
                    .stat(dirPath)
                    .catch((): null => null);
                if (stats?.isDirectory()) {
                    await fsPromises.rm(dirPath, {
                        recursive: true,
                        force: true,
                    });
                    console.log(`[ModelDownloadService] Deleted: ${dirPath}`);
                }
            } catch (err) {
                console.warn(
                    `[ModelDownloadService] Failed to delete ${dirPath}:`,
                    err,
                );
            }
        }

        for (const name of comfyFiles) {
            const filePath = path.join(this.serverBasePath, name);
            await fsPromises.unlink(filePath).catch(() => {});
        }
    }

    /**
     * Delete a specific model file
     */
    async deleteModel(modelType: "image" | "audio"): Promise<void> {
        const model = MODELS[modelType];
        const modelPath = path.join(
            this.modelsBasePath,
            model.subfolder,
            model.filename,
        );

        try {
            const stats = await fsPromises
                .stat(modelPath)
                .catch((): null => null);
            if (stats) {
                await fsPromises.unlink(modelPath);
                console.log(
                    `[ModelDownloadService] Deleted model: ${modelPath}`,
                );
            }
        } catch (err) {
            console.warn(
                `[ModelDownloadService] Failed to delete model ${modelPath}:`,
                err,
            );
        }
    }

    cancelDownload(
        downloadType: "comfyui" | "image" | "audio" | "languagetool",
    ): void {
        // Abort active download
        const download = this.activeDownloads.get(downloadType);
        if (download) {
            download.abort();
            this.activeDownloads.delete(downloadType);
        }
        // Kill active extraction process
        const extraction = this.activeExtractions.get(downloadType);
        if (extraction) {
            extraction.kill();
            this.activeExtractions.delete(downloadType);
        }
        // Clean up partial files for this download type
        this.cleanupPartialDownload(downloadType);
    }

    cancelAllDownloads(): void {
        for (const [type] of this.activeDownloads) {
            this.cancelDownload(
                type as "comfyui" | "image" | "audio" | "languagetool",
            );
        }
    }

    /**
     * Clean up partial downloads, archives, and extracted directories for a download type
     */
    private async cleanupPartialDownload(
        downloadType: "comfyui" | "image" | "audio" | "languagetool",
    ): Promise<void> {
        const paths = this.cleanupPaths.get(downloadType);
        if (!paths || paths.length === 0) {
            return;
        }

        console.log(
            `[ModelDownloadService] Cleaning up partial ${downloadType} download...`,
        );

        for (const filePath of paths) {
            try {
                const stats = await fsPromises
                    .stat(filePath)
                    .catch((): null => null);
                if (stats) {
                    if (stats.isDirectory()) {
                        await fsPromises.rm(filePath, {
                            recursive: true,
                            force: true,
                        });
                        console.log(
                            `[ModelDownloadService] Removed directory: ${filePath}`,
                        );
                    } else {
                        await fsPromises.unlink(filePath);
                        console.log(
                            `[ModelDownloadService] Removed file: ${filePath}`,
                        );
                    }
                }
            } catch (err) {
                console.warn(
                    `[ModelDownloadService] Failed to clean up ${filePath}:`,
                    err,
                );
            }
        }

        this.cleanupPaths.delete(downloadType);
    }
}

export const modelDownloadService = new ModelDownloadService();
