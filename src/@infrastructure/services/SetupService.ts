import { app } from "electron";
import * as fs from "fs/promises";
import * as path from "path";

export interface SetupConfig {
    setupCompleted: boolean;
    comfyuiInstalled: boolean;
    languageToolInstalled: boolean;
    features: {
        aiChat: boolean;
        imageGeneration: boolean;
        audioGeneration: boolean;
    };
    theme: {
        colorScheme: "dark" | "light";
        accentColor: string;
    };
    modelsDownloaded: {
        image: boolean;
        audio: boolean;
    };
}

const DEFAULT_SETUP_CONFIG: SetupConfig = {
    setupCompleted: false,
    comfyuiInstalled: false,
    languageToolInstalled: false,
    features: {
        aiChat: true,
        imageGeneration: false,
        audioGeneration: false,
    },
    theme: {
        colorScheme: "dark",
        accentColor: "#4a90e2",
    },
    modelsDownloaded: {
        image: false,
        audio: false,
    },
};

export class SetupService {
    private configPath: string;
    private config: SetupConfig | null = null;

    constructor() {
        this.configPath = path.join(
            app.getPath("userData"),
            "inkline-setup.json"
        );
    }

    async isFirstRun(): Promise<boolean> {
        try {
            await fs.access(this.configPath);
            const config = await this.getConfig();
            return !config.setupCompleted;
        } catch {
            // File doesn't exist - first run
            return true;
        }
    }

    async getConfig(): Promise<SetupConfig> {
        if (this.config) {
            return this.config;
        }

        try {
            const content = await fs.readFile(this.configPath, "utf-8");
            this.config = { ...DEFAULT_SETUP_CONFIG, ...JSON.parse(content) };
            return this.config;
        } catch {
            this.config = { ...DEFAULT_SETUP_CONFIG };
            return this.config;
        }
    }

    async saveConfig(config: Partial<SetupConfig>): Promise<void> {
        const currentConfig = await this.getConfig();
        this.config = { ...currentConfig, ...config };
        await fs.writeFile(
            this.configPath,
            JSON.stringify(this.config, null, 2),
            "utf-8"
        );
    }

    async markSetupComplete(): Promise<void> {
        await this.saveConfig({ setupCompleted: true });
    }

    async updateFeatures(
        features: Partial<SetupConfig["features"]>
    ): Promise<void> {
        const currentConfig = await this.getConfig();
        await this.saveConfig({
            features: { ...currentConfig.features, ...features },
        });
    }

    async updateTheme(theme: Partial<SetupConfig["theme"]>): Promise<void> {
        const currentConfig = await this.getConfig();
        await this.saveConfig({
            theme: { ...currentConfig.theme, ...theme },
        });
    }

    async markModelDownloaded(
        modelType: "image" | "audio",
        downloaded: boolean
    ): Promise<void> {
        const currentConfig = await this.getConfig();
        await this.saveConfig({
            modelsDownloaded: {
                ...currentConfig.modelsDownloaded,
                [modelType]: downloaded,
            },
        });
    }

    async markComfyUIInstalled(installed: boolean): Promise<void> {
        await this.saveConfig({ comfyuiInstalled: installed });
    }

    async isComfyUIInstalled(): Promise<boolean> {
        const config = await this.getConfig();
        return config.comfyuiInstalled;
    }

    async markLanguageToolInstalled(installed: boolean): Promise<void> {
        await this.saveConfig({ languageToolInstalled: installed });
    }

    async isLanguageToolInstalled(): Promise<boolean> {
        const config = await this.getConfig();
        return config.languageToolInstalled;
    }

    getModelsPath(): string {
        // In development, models are in server/ComfyUI/models
        // In production, they're in resources/server/ComfyUI/models
        if (app.isPackaged) {
            return path.join(
                process.resourcesPath,
                "server",
                "ComfyUI",
                "models"
            );
        }
        return path.join(app.getAppPath(), "server", "ComfyUI", "models");
    }
}

export const setupService = new SetupService();
