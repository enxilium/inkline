import { app } from "electron";
import * as path from "path";

/**
 * Writable runtime location for server assets (ComfyUI, models, LanguageTool).
 * MSIX installs are read-only under process.resourcesPath, so packaged builds
 * must use userData.
 */
export function getRuntimeServerBasePath(): string {
    if (app.isPackaged) {
        return path.join(app.getPath("userData"), "server");
    }

    return path.join(app.getAppPath(), "server");
}
