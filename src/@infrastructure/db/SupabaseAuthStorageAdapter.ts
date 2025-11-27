import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { SupportedStorage } from "@supabase/supabase-js";

export class SupabaseAuthStorageAdapter implements SupportedStorage {
    private static FILENAME = "supabase-auth-session.json";

    async getItem(key: string): Promise<string | null> {
        try {
            const filePath = await this.resolveFilePath();
            if (!fs.existsSync(filePath)) {
                return null;
            }
            const content = await fs.promises.readFile(filePath, "utf-8");
            const data = JSON.parse(content);
            return data[key] || null;
        } catch (error) {
            console.error("Error reading auth session:", error);
            return null;
        }
    }

    async setItem(key: string, value: string): Promise<void> {
        try {
            const filePath = await this.resolveFilePath();
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }

            let data: Record<string, string> = {};
            if (fs.existsSync(filePath)) {
                const content = await fs.promises.readFile(filePath, "utf-8");
                try {
                    data = JSON.parse(content);
                } catch {
                    // Ignore parse error, start fresh
                }
            }

            data[key] = value;
            await fs.promises.writeFile(
                filePath,
                JSON.stringify(data, null, 2),
                "utf-8"
            );
        } catch (error) {
            console.error("Error saving auth session:", error);
        }
    }

    async removeItem(key: string): Promise<void> {
        try {
            const filePath = await this.resolveFilePath();
            if (!fs.existsSync(filePath)) {
                return;
            }

            const content = await fs.promises.readFile(filePath, "utf-8");
            const data = JSON.parse(content);
            delete data[key];

            await fs.promises.writeFile(
                filePath,
                JSON.stringify(data, null, 2),
                "utf-8"
            );
        } catch (error) {
            console.error("Error removing auth session:", error);
        }
    }

    private async resolveFilePath(): Promise<string> {
        if (!app.isReady()) {
            await app.whenReady();
        }
        return path.join(
            app.getPath("userData"),
            SupabaseAuthStorageAdapter.FILENAME
        );
    }
}
