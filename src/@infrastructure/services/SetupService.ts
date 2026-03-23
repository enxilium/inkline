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
    legalAccepted: boolean;
    legalAcceptedAt: string | null;
    legalVersion: string;
    firstProjectCreated: boolean;
    firstProjectCreatedAt: string | null;
    tutorialCompletedAt: string | null;
    tutorialSkippedAt: string | null;
    tutorialVersion: string;
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
    legalAccepted: false,
    legalAcceptedAt: null,
    legalVersion: "2026-03-22",
    firstProjectCreated: false,
    firstProjectCreatedAt: null,
    tutorialCompletedAt: null,
    tutorialSkippedAt: null,
    tutorialVersion: "v1",
};

export class SetupService {
    private configPath: string;
    private config: SetupConfig | null = null;

    constructor() {
        this.configPath = path.join(
            app.getPath("userData"),
            "inkline-setup.json",
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
            "utf-8",
        );
    }

    async updateFeatures(
        features: Partial<SetupConfig["features"]>,
    ): Promise<void> {
        const currentConfig = await this.getConfig();
        await this.saveConfig({
            features: { ...currentConfig.features, ...features },
        });
    }

    async markModelDownloaded(
        modelType: "image" | "audio",
        downloaded: boolean,
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

    async markLanguageToolInstalled(installed: boolean): Promise<void> {
        await this.saveConfig({ languageToolInstalled: installed });
    }

    async markFirstProjectCreated(): Promise<void> {
        const currentConfig = await this.getConfig();
        if (currentConfig.firstProjectCreated) {
            return;
        }

        await this.saveConfig({
            firstProjectCreated: true,
            firstProjectCreatedAt: new Date().toISOString(),
        });
    }

    async markTutorialCompleted(): Promise<void> {
        await this.saveConfig({
            tutorialCompletedAt: new Date().toISOString(),
            tutorialSkippedAt: null,
        });
    }

    async markTutorialSkipped(): Promise<void> {
        await this.saveConfig({
            tutorialSkippedAt: new Date().toISOString(),
        });
    }

    async resetTutorialProgress(): Promise<void> {
        await this.saveConfig({
            tutorialCompletedAt: null,
            tutorialSkippedAt: null,
        });
    }
}

export const setupService = new SetupService();
