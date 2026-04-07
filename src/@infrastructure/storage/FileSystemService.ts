import { app } from "electron";
import * as fs from "fs/promises";
import * as path from "path";

export class FileSystemService {
    private basePath: string;

    constructor() {
        // We use a subfolder 'inkline-data' to keep things organized
        this.basePath = path.join(app.getPath("userData"), "inkline-data");
    }

    async initialize(): Promise<void> {
        try {
            await fs.access(this.basePath);
        } catch {
            await fs.mkdir(this.basePath, { recursive: true });
        }
    }

    async writeJson<T>(filePath: string, data: T): Promise<void> {
        const fullPath = this.resolvePath(filePath);
        const tempPath = this.createTempPath(fullPath);
        const dir = path.dirname(fullPath);

        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
        await fs.rename(tempPath, fullPath);
    }

    async writeFile(
        filePath: string,
        data: Buffer | Uint8Array,
    ): Promise<void> {
        const fullPath = this.resolvePath(filePath);
        const tempPath = this.createTempPath(fullPath);
        const dir = path.dirname(fullPath);

        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(tempPath, data);
        await fs.rename(tempPath, fullPath);
    }

    private createTempPath(fullPath: string): string {
        const uniqueSuffix = `${Date.now()}-${process.pid}-${Math.random()
            .toString(16)
            .slice(2)}`;
        return `${fullPath}.${uniqueSuffix}.tmp`;
    }

    async readJson<T>(filePath: string): Promise<T | null> {
        const fullPath = this.resolvePath(filePath);
        try {
            const content = await fs.readFile(fullPath, "utf-8");
            return JSON.parse(content) as T;
        } catch (error) {
            return null;
        }
    }

    async readBuffer(filePath: string): Promise<Buffer | null> {
        const fullPath = this.resolvePath(filePath);
        try {
            return await fs.readFile(fullPath);
        } catch {
            return null;
        }
    }

    async deleteFile(filePath: string): Promise<void> {
        const fullPath = this.resolvePath(filePath);
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            // Ignore if file doesn't exist
        }
    }

    async deleteDirectory(dirPath: string): Promise<void> {
        const fullPath = this.resolvePath(dirPath);
        try {
            await fs.rm(fullPath, { recursive: true, force: true });
        } catch (error) {
            // Ignore if dir doesn't exist
        }
    }

    async listFiles(dirPath: string): Promise<string[]> {
        const fullPath = this.resolvePath(dirPath);
        try {
            return await fs.readdir(fullPath);
        } catch {
            return [];
        }
    }

    async exists(filePath: string): Promise<boolean> {
        const fullPath = this.resolvePath(filePath);
        try {
            await fs.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    getBasePath(): string {
        return this.basePath;
    }

    resolvePath(relativePath: string): string {
        const normalizedPath = relativePath
            .replace(/\\/g, "/")
            .replace(/^\/+/, "");
        return path.join(this.basePath, normalizedPath);
    }
}

export const fileSystemService = new FileSystemService();
