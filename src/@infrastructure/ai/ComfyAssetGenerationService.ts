import { IImageGenerationService } from "../../@core/domain/services/IImageGenerationService";
import { Character } from "../../@core/domain/entities/story/world/Character";
import { Location } from "../../@core/domain/entities/story/world/Location";
import { Organization } from "../../@core/domain/entities/story/world/Organization";
import { IAudioGenerationService } from "../../@core/domain/services/IAudioGenerationService";
import { NarrativeContext } from "../../@core/domain/services/NarrativeContext";
import { IUserSessionStore } from "../../@core/domain/services/IUserSessionStore";
import { IChapterRepository } from "../../@core/domain/repositories/IChapterRepository";
import { ICharacterRepository } from "../../@core/domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../@core/domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../@core/domain/repositories/IOrganizationRepository";
import { IScrapNoteRepository } from "../../@core/domain/repositories/IScrapNoteRepository";
import portfinder from "portfinder";
import {
    ComfyApi,
    PromptBuilder,
    CallWrapper,
    HistoryEntry,
} from "@saintno/comfyui-sdk";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { app } from "electron";
import { GoogleGenAI } from "@google/genai";

const ERROR_MESSAGE = "Audio generation is not available in this build.";

type WorkflowFileInfo = {
    filename: string;
    subfolder?: string;
    type?: string;
};

type WorkflowGraphNode = {
    inputs: Record<string, unknown>;
    class_type: string;
    _meta: { title: string } & Record<string, unknown>;
};

type WorkflowGraph = Record<string, WorkflowGraphNode>;

export class ComfyAssetGenerationService
    implements IAudioGenerationService, IImageGenerationService
{
    private sessionStore: IUserSessionStore;
    private chapterRepository: IChapterRepository;
    private characterRepository: ICharacterRepository;
    private locationRepository: ILocationRepository;
    private organizationRepository: IOrganizationRepository;
    private scrapNoteRepository: IScrapNoteRepository;
    private api: ComfyApi;
    private serverProcess: ChildProcess | null = null;
    private basePath = "";
    private serverReady: Promise<void>;
    private genAI: GoogleGenAI | null = null;

    constructor(
        sessionStore: IUserSessionStore,
        chapterRepository: IChapterRepository,
        characterRepository: ICharacterRepository,
        locationRepository: ILocationRepository,
        organizationRepository: IOrganizationRepository,
        scrapNoteRepository: IScrapNoteRepository
    ) {
        this.sessionStore = sessionStore;
        this.chapterRepository = chapterRepository;
        this.characterRepository = characterRepository;
        this.locationRepository = locationRepository;
        this.organizationRepository = organizationRepository;
        this.scrapNoteRepository = scrapNoteRepository;

        this.serverReady = this.initializeServer();
    }

    public async waitForReady(): Promise<void> {
        return this.serverReady;
    }

    private async initializeServer() {
        if (process.platform !== "win32") {
            console.warn(
                "[ComfyAssetGenerationService] ComfyUI server is only supported on Windows. Skipping initialization."
            );
            return;
        }

        try {
            const port = await portfinder.getPortPromise({ port: 8188 });
            console.log(
                `[ComfyAssetGenerationService] Found free port: ${port}`
            );

            this.basePath = app.isPackaged
                ? path.join(process.resourcesPath, "server")
                : path.join(app.getAppPath(), "server");

            const pythonPath = path.join(
                this.basePath,
                "python_embeded",
                "python.exe"
            );
            const mainScript = path.join(this.basePath, "ComfyUI", "main.py");

            if (!fs.existsSync(pythonPath)) {
                console.error(
                    `[ComfyAssetGenerationService] Python not found at: ${pythonPath}`
                );
                return;
            }

            console.log(
                `[ComfyAssetGenerationService] Launching ComfyUI from ${this.basePath}...`
            );

            this.serverProcess = spawn(
                pythonPath,
                [
                    "-s",
                    mainScript,
                    "--port",
                    port.toString(),
                    "--windows-standalone-build",
                    "--disable-auto-launch",
                ],
                {
                    cwd: this.basePath,
                    stdio: "inherit", // Ignore stdio to prevent blocking, or 'inherit' for debugging
                    windowsHide: true,
                }
            );

            this.serverProcess.on("error", (err) => {
                console.error(
                    "[ComfyAssetGenerationService] Failed to start ComfyUI:",
                    err
                );
            });

            await this.waitForServer(port);

            this.api = new ComfyApi(`http://127.0.0.1:${port}`);
            this.api.init();
            console.log(
                `[ComfyAssetGenerationService] ComfyUI SDK Initialized on port ${port}.`
            );
        } catch (error) {
            console.error(
                "[ComfyAssetGenerationService] Initialization failed:",
                error
            );
        }
    }

    private async waitForServer(port: number, retries = 120): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(
                    `http://127.0.0.1:${port}/system_stats`
                );
                if (response.ok) return;
            } catch (e) {
                // Ignore connection refused
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        throw new Error("ComfyUI server failed to start within timeout");
    }

    private loadWorkflowFile(filename: string) {
        if (!this.basePath) {
            throw new Error("ComfyUI server path is not initialized.");
        }

        const workflowPath = path.join(this.basePath, filename);
        if (!fs.existsSync(workflowPath)) {
            throw new Error(`Workflow file not found: ${workflowPath}`);
        }

        const raw = fs.readFileSync(workflowPath, "utf-8");
        return JSON.parse(raw);
    }

    private safeJsonParse<T>(value?: string, fallback: T = {} as T): T {
        if (!value) {
            return fallback;
        }

        try {
            return JSON.parse(value) as T;
        } catch (error) {
            console.warn(
                "[ComfyAssetGenerationService] Failed to parse Gemini payload, falling back.",
                error
            );
            return fallback;
        }
    }

    private async getGeminiClient(): Promise<GoogleGenAI> {
        if (this.genAI) {
            return this.genAI;
        }

        const user = await this.sessionStore.load();
        const key = user?.preferences.geminiApiKey
            ? user.preferences.geminiApiKey
            : process.env.GEMINI_API_KEY;

        if (!key) {
            throw new Error(
                "Gemini API Key is missing. Please add it in Settings."
            );
        }

        this.genAI = new GoogleGenAI({ apiKey: key });
        return this.genAI;
    }

    async generateBGM(
        subject: Character | Location | Organization,
        onProgress: (progress: number) => void
    ): Promise<ArrayBuffer> {
        if (process.platform !== "win32") {
            throw new Error(
                "Audio generation is currently only available on Windows."
            );
        }
        await this.serverReady;
        if (!this.api) throw new Error("ComfyUI server not initialized");

        const client = await this.getGeminiClient();
        const subjectDescription = await this.buildSubjectDescription(subject);

        const prompt = `
            You are a professional music composer and AI audio prompt expert.
            Your task is to generate a JSON configuration for the ACE-Step music generation model based on the following subject from a story:
            
            ${subjectDescription}

            ## ACE-Step Prompt Guide
            - 'tags': A comma-separated list of music styles, instruments, moods, and scene types. Examples:
              - Moods: uplifting, melancholic, energetic, calm, mysterious, adventurous, romantic, tense, dark, etc.
              - Styles: electronic, rock, pop, funk, soul, cyberpunk, Acid jazz, electro, melodic, etc.
              - Scenes: background music for parties, radio broadcasts, workout playlists, etc.
              - Instruments: saxophone, jazz, piano, violin, acoustic guitar, electric bass, etc.
              - Vocals: female voice, male voice, clean vocals.
              - Tech: 110 bpm, fast tempo, slow tempo, loops, fills.
            - 'lyrics': (Optional) Lyrics with structure tags like [verse], [chorus], [bridge], [outro].
              - If the description implies vocals, write lyrics in English (or use language tags like [zh], [ja] if appropriate for the character, but prefer English for compatibility).
              - If instrumental, leave empty or provide minimal structure if needed.
            - 'seconds': Duration in seconds (default 60).

            ## Output Format
            Return a single JSON object with keys: 'tags', 'lyrics', 'seconds'.
        `;

        const result = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction:
                    "You are an expert prompter for AI text-to-music generation models. Respond with JSON only.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        tags: { type: "STRING" },
                        lyrics: { type: "STRING" },
                        seconds: { type: "NUMBER" },
                    },
                    required: ["tags"],
                },
            },
        });

        type AudioPrompt = { tags?: string; lyrics?: string; seconds?: number };
        const data = this.safeJsonParse<AudioPrompt>(result.text);

        const workflow = this.loadWorkflowFile("txt2audio.json");
        const builder = new PromptBuilder(
            workflow,
            ["tags", "lyrics", "seconds"],
            ["audio"]
        )
            .setRawInputNode("tags", "74:14.inputs.tags")
            .setRawInputNode("lyrics", "74:14.inputs.lyrics")
            .setRawInputNode("seconds", "74:17.inputs.seconds")
            .setRawOutputNode("audio", "59");

        builder
            .input("tags", data.tags?.trim() || "instrumental")
            .input("lyrics", data.lyrics || "")
            .input(
                "seconds",
                typeof data.seconds === "number" && data.seconds > 0
                    ? data.seconds
                    : 60
            );

        return this.executeWorkflow(builder, "audio", onProgress);
    }

    async generatePortrait(
        subject: Character | Location | Organization,
        onProgress: (progress: number) => void
    ): Promise<ArrayBuffer> {
        if (process.platform !== "win32") {
            throw new Error(
                "Image generation is currently only available on Windows."
            );
        }
        await this.serverReady;
        if (!this.api) throw new Error("ComfyUI server not initialized");

        const client = await this.getGeminiClient();
        const subjectDescription = await this.buildSubjectDescription(subject);

        const prompt = `
        You are a professional AI drawing prompt expert, specializing in creating high-quality prompts for Neta Lumina drawing models. Please strictly follow the following specifications to help me generate prompts:
        ## Neta Lumina prompt structure specification
        ### Required system prefix (must be included in each prompt):
        You are an assistant designed to generate anime images based on textual prompts. <Prompt Start> 
        ### Standard sequence of parts (9 parts):
        1. Character trigger words (e.g., 1girl, 1boy, 2girls, character name, etc.)
        2. Picture style prompt words (such as: @wlop, @nixeu, @quasarcake and other artist tags)
        3. Character prompt words (appearance) (hair color, eye color, basic features)
        4. Character costume prompt (specific costume description)
        5. Character expression and action prompts (expression, posture, action)
        6. Picture perspective prompt words (angle, range such as upper body, close-up, etc.)
        7. Special effects prompts (lighting, special effects)
        8. Scene atmosphere prompt (environment, atmosphere)
        9. Quality tips (best quality)

        ### Natural language part standard order (5 parts):
        1. ** Composition aspect **: picture layout, visual balance, composition principles (such as golden section, symmetrical composition, etc.)
        2. **Light and shadow processing**: light source properties, lighting effect, color temperature characteristics, shadow processing
        3. **Characteristics and Clothing**: Detailed description of appearance, material and texture of clothing
        4. **Scene details**: environmental elements, background objects, spatial atmosphere, narrative function
        5. **Artistic style**: Painting techniques, artistic schools, overall style definition
        ## Important format requirements
        ### Neta Lumina special grammar:
        -Underline to space: school_uniform → school uniform
        -Weight bracket expansion: (klee_(genshin_impact): 1.2), → (klee \\(genshin impact\\): 1.2),
        -The artist tag is reinforced with the @ symbol: @wlop, @nixeu
        -Negative prompt words also need the same system prefix
        ### Quality standards:
        -The Tag part should be concise and accurate to avoid redundancy
        -Natural language should be vivid and concrete, with a sense of picture
        -The overall description should be logical and clear
        -Ensure that Tags complement and do not duplicate natural language
        ## Creative tasks
        [My creative idea]: Generate a high-quality anime-style portrait of the following entity in the story:
        ${subjectDescription}
        ## Please help me complete the following tasks:
        1. ** Analyze the idea **: Understand my creative intention and core elements
        2. **Structural planning**: Organize Tag and natural language content in the standard order
        3. **Generate prompt words**: Create complete Neta Lumina format prompt words
        ## Output format example
        **Full prompt:**
        You are an assistant designed to generate anime images based on text prompts. <Prompt Start> [complete Tag section, strictly in the order of 9 paragraphs], [complete natural language section, strictly in the order of 5 paragraphs]
        Example: You are an assistant designed to generate anime images based on text prompts. <Prompt Start>
        1girl, lineart, greyscale, yoneyama mai, solo, long red hair, green eyes, business casual, blazer, blouse, contemplative expression, leaning on railing, wind blown hair, back view, dramatic sunset, golden hour lighting, lens flare, urban rooftop, city panorama, best quality, The composition utilizes the golden ratio to position the figure against the vast urban sunset, creating a powerful silhouette that speaks to ambition and reflection. Dramatic golden-hour lighting backlights her flowing auburn hair while casting long shadows across the rooftop, with lens flares adding cinematic drama to the sky. Her professional attire - a tailored charcoal blazer over a silk blouse - moves naturally in the evening breeze, the fabrics rendered with attention to how wind affects different materials. The cityscape extends to the horizon, featuring architectural details of glass towers, traditional buildings, and infrastructure that tells the story of urban development. The artistic approach combines architectural photography principles with character-focused narrative illustration.
        Please start helping me create prompts now.
        `;

        const result = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction:
                    "You are a professional AI drawing prompt expert. Your role is to come up with textual prompts that can be used to have a stable diffusion model generate reference images for characters, locations, or organizations within a novel. Respond with the full prompt only, no explanations.",
            },
        });

        const workflow = this.loadWorkflowFile("txt2image.json");
        const builder = new PromptBuilder(
            workflow,
            ["positive", "negative"],
            ["images"]
        )
            .setRawInputNode("positive", "6.inputs.text")
            .setRawInputNode("negative", "7.inputs.text")
            .setRawOutputNode("images", "9");

        builder
            .input("positive", result.text)
            .input(
                "negative",
                "You are an assistant designed to generate low-quality images based on textual prompts <Prompt Start> blurry, worst quality, low quality, jpeg artifacts, signature, watermark, username, error, deformed hands, bad anatomy, extra limbs, poorly drawn hands, poorly drawn face, mutation, deformed, extra eyes, extra arms, extra legs, malformed limbs, fused fingers, too many fingers, long neck, cross-eyed, bad proportions, missing arms, missing legs, extra digit, fewer digits, cropped"
            );

        return this.executeWorkflow(builder, "images", onProgress);
    }

    async generateCover(projectId: string): Promise<ArrayBuffer> {
        void projectId;
        throw new Error(ERROR_MESSAGE);
    }

    async generateScene(
        description: string,
        context: NarrativeContext
    ): Promise<ArrayBuffer> {
        void description;
        void context;
        throw new Error(ERROR_MESSAGE);
    }

    private async buildSubjectDescription(
        subject: Character | Location | Organization
    ): Promise<string> {
        let description = `Type: ${subject.constructor.name}\nName: ${subject.name}\nDescription: ${subject.description}`;

        if (subject instanceof Character) {
            description += `\nRace: ${subject.race || "Unknown"}`;
            if (subject.age) {
                description += `\nAge: ${subject.age}`;
            }

            if (subject.currentLocationId) {
                const location = await this.locationRepository.findById(
                    subject.currentLocationId
                );
                if (location) {
                    description += `\nCurrent Location (Background): ${location.name} - ${location.description}`;
                }
            }
        }

        return description;
    }

    private async executeWorkflow<I extends string, O extends string>(
        builder: PromptBuilder<I, O, WorkflowGraph>,
        outputKey: O,
        onProgress: (progress: number) => void
    ): Promise<ArrayBuffer> {
        if (!this.api) {
            throw new Error("ComfyUI server not initialized");
        }

        return new Promise((resolve, reject) => {
            const wrapper = new CallWrapper(this.api, builder);
            let promptId: string | undefined;

            wrapper.onPending((id) => {
                promptId = id;
            });

            wrapper.onProgress((status: { value: number; max: number }) => {
                const p =
                    status.max > 0
                        ? Math.round((status.value / status.max) * 100)
                        : 0;
                onProgress(p);
            });

            wrapper.onFinished(async (data: Record<string, unknown>) => {
                try {
                    const outputNode = data[outputKey];
                    const fileInfo = this.extractFileInfo(outputNode);

                    if (!fileInfo) {
                        reject(new Error("No output generated"));
                        return;
                    }

                    const buffer = await this.downloadOutput(fileInfo);
                    resolve(buffer);
                } catch (error) {
                    reject(error as Error);
                }
            });

            wrapper.onFailed(async (err: Error) => {
                // Check for disconnection error
                if (
                    err.message.includes("Disconnected") ||
                    err.name === "DisconnectedError"
                ) {
                    console.warn(
                        "[ComfyAssetGenerationService] Disconnected during generation. Attempting to recover..."
                    );
                    if (promptId) {
                        try {
                            // Attempt to recover via polling
                            const outputNodeId =
                                builder.mapOutputKeys[outputKey];
                            if (!outputNodeId) {
                                reject(
                                    new Error(
                                        "Could not determine output node ID for recovery"
                                    )
                                );
                                return;
                            }

                            const fileInfo = await this.pollForCompletion(
                                promptId,
                                outputNodeId
                            );
                            const buffer = await this.downloadOutput(fileInfo);
                            resolve(buffer);
                            return;
                        } catch (recoveryError) {
                            console.error(
                                "[ComfyAssetGenerationService] Recovery failed:",
                                recoveryError
                            );
                            reject(err); // Reject with original error if recovery fails
                            return;
                        }
                    }
                }
                reject(err);
            });

            wrapper.run();
        });
    }

    private async pollForCompletion(
        promptId: string,
        outputNodeId: string
    ): Promise<WorkflowFileInfo> {
        const maxRetries = 60; // 5 minutes (assuming 5s interval)
        const interval = 5000;

        for (let i = 0; i < maxRetries; i++) {
            try {
                const history: HistoryEntry | undefined =
                    await this.api.getHistory(promptId);
                if (history) {
                    // Job finished
                    const output = history.outputs?.[outputNodeId];
                    if (output) {
                        const fileInfo = this.extractFileInfo(output);
                        if (fileInfo) return fileInfo;
                    }
                    // If history exists but no output for that node, maybe it failed or node didn't output?
                    if (
                        history.status &&
                        history.status.status_str === "error"
                    ) {
                        throw new Error(
                            `Workflow failed: ${JSON.stringify(
                                history.status.messages
                            )}`
                        );
                    }
                }
            } catch (e) {
                // Ignore errors during polling (e.g. connection issues)
                console.warn("[ComfyAssetGenerationService] Polling error:", e);
                // Try to reconnect if needed
                try {
                    await this.api.reconnectWs(false);
                } catch (reconnectErr) {
                    // ignore
                }
            }
            await new Promise((resolve) => setTimeout(resolve, interval));
        }
        throw new Error("Polling timed out");
    }

    private extractFileInfo(outputNode: unknown): WorkflowFileInfo | null {
        const inspect = (value: unknown): WorkflowFileInfo | null => {
            if (!value) {
                return null;
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    const info = inspect(item);
                    if (info) {
                        return info;
                    }
                }
                return null;
            }

            if (typeof value === "object") {
                const obj = value as Record<string, unknown>;

                if (typeof obj.filename === "string") {
                    return {
                        filename: obj.filename,
                        subfolder:
                            typeof obj.subfolder === "string"
                                ? obj.subfolder
                                : "",
                        type:
                            typeof obj.type === "string" ? obj.type : "output",
                    };
                }

                for (const key of Object.keys(obj)) {
                    const nested = inspect(obj[key]);
                    if (nested) {
                        return nested;
                    }
                }
            }

            return null;
        };

        return inspect(outputNode);
    }

    private async downloadOutput(
        fileInfo: WorkflowFileInfo
    ): Promise<ArrayBuffer> {
        if (!this.api) {
            throw new Error("ComfyUI server not initialized");
        }

        const params = new URLSearchParams({
            filename: fileInfo.filename,
            type: fileInfo.type ?? "output",
            subfolder: fileInfo.subfolder ?? "",
        });

        const response = await this.api.fetchApi(`/view?${params.toString()}`);
        if (!response.ok) {
            throw new Error(
                `Failed to download generated asset (${response.status})`
            );
        }

        return response.arrayBuffer();
    }
}
