import { GoogleGenAI, Content } from "@google/genai";
import {
    ChatHistoryOptions,
    IAITextService,
} from "../../@core/domain/services/IAITextService";
import { NarrativeContext } from "../../@core/domain/services/NarrativeContext";
import { IUserSessionStore } from "../../@core/domain/services/IUserSessionStore";
import { IChapterRepository } from "../../@core/domain/repositories/IChapterRepository";
import { ICharacterRepository } from "../../@core/domain/repositories/ICharacterRepository";
import { ILocationRepository } from "../../@core/domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../@core/domain/repositories/IOrganizationRepository";
import { IScrapNoteRepository } from "../../@core/domain/repositories/IScrapNoteRepository";

export class GeminiAITextService implements IAITextService {
    private sessionStore: IUserSessionStore;
    private chapterRepository: IChapterRepository;
    private characterRepository: ICharacterRepository;
    private locationRepository: ILocationRepository;
    private organizationRepository: IOrganizationRepository;
    private scrapNoteRepository: IScrapNoteRepository;
    private genAI: GoogleGenAI;

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
    }

    private async getModel(): Promise<GoogleGenAI> {
        if (!this.genAI) {
            const user = await this.sessionStore.load();
            const key = user?.preferences.geminiApiKey;

            if (!key) {
                throw new Error(
                    "Gemini API Key is missing. Please add it in Settings."
                );
            }

            this.genAI = new GoogleGenAI({ apiKey: key });
        }

        return this.genAI;
    }

    private formatContext(context: NarrativeContext): string {
        // Format the narrative context into a string for the prompt
        let contextString = "Narrative Context:\n";
        if (context.summary) contextString += `Summary: ${context.summary}\n`;
        if (context.characterProfiles)
            contextString += `Characters: ${context.characterProfiles}\n`;
        if (context.locationProfiles)
            contextString += `Locations: ${context.locationProfiles}\n`;
        if (context.organizationProfiles)
            contextString += `Organizations: ${context.organizationProfiles}\n`;
        return contextString;
    }

    async *analyze(
        content: string,
        instruction: string,
        context: NarrativeContext
    ): AsyncGenerator<string, void, unknown> {
        const contextStr = this.formatContext(context);

        const systemInstruction = `You are an expert editor and creative writing coach.
            Your task is to analyze a specific portion of a manuscript based on the user's instructions.
            Use the provided narrative context to ensure your analysis is consistent with the story's world, characters, and plot.`;

        const prompt = `
            --- NARRATIVE CONTEXT ---
            ${contextStr}

            --- CONTENT TO ANALYZE ---
            ${content}

            --- INSTRUCTION ---
            ${instruction}

            Please provide your analysis.`;

        const client = await this.getModel();
        const result = await client.models.generateContentStream({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
            },
        });

        for await (const chunk of result) {
            yield chunk.text;
        }
    }

    async editManuscript(
        chapterIds: string[],
        context: NarrativeContext
    ): Promise<
        {
            chapterId: string;
            comment: string;
            wordNumberStart: number;
            wordNumberEnd: number;
        }[]
    > {
        const client = await this.getModel();
        const contextStr = this.formatContext(context);

        // Fetch chapters
        const chapters = await Promise.all(
            chapterIds.map((id) => this.chapterRepository.findById(id))
        );

        const validChapters = chapters.filter((c) => c !== null);
        if (validChapters.length === 0) {
            return [];
        }

        const manuscriptContent = validChapters
            .map(
                (c) =>
                    `--- CHAPTER ID: ${c.id} ---\nTitle: ${c.title}\nContent: ${c.content}`
            )
            .join("\n\n");

        const systemInstruction = `You are an expert editor.
            Your task is to review the provided manuscript chapters and provide specific comments and suggestions.
            You must identify the exact location of each comment using word counts relative to the start of the chapter.
            The word count starts at 0.
            Return the result as a JSON array.`;

        const prompt = `
            --- NARRATIVE CONTEXT ---
            ${contextStr}

            --- MANUSCRIPT CONTENT ---
            ${manuscriptContent}

            Please review the manuscript and provide comments.`;

        const result = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            chapterId: { type: "STRING" },
                            comment: { type: "STRING" },
                            wordNumberStart: { type: "NUMBER" },
                            wordNumberEnd: { type: "NUMBER" },
                        },
                        required: [
                            "chapterId",
                            "comment",
                            "wordNumberStart",
                            "wordNumberEnd",
                        ],
                    },
                },
            },
        });

        try {
            const text = result.text;
            if (text) {
                return JSON.parse(text);
            }
        } catch (e) {
            console.error("Failed to parse JSON response", e);
        }

        return [];
    }

    async *chat(
        prompt: string,
        context: NarrativeContext,
        options?: ChatHistoryOptions
    ): AsyncGenerator<string, void, unknown> {
        const client = await this.getModel();

        let history: Content[] = [];
        if (options?.history) {
            history = options.history.map((h) => ({
                role: h.role === "user" ? "user" : "model",
                parts: [{ text: h.content }],
            }));
        }

        let additionalContext = "";
        if (options?.contextDocuments && options.contextDocuments.length > 0) {
            additionalContext += "\n\n--- ATTACHED DOCUMENTS ---\n";
            for (const doc of options.contextDocuments) {
                let content = "";
                try {
                    switch (doc.type) {
                        case "chapter": {
                            const chapter =
                                await this.chapterRepository.findById(doc.id);
                            if (chapter)
                                content = `Chapter: ${chapter.title}\n${chapter.content}`;
                            break;
                        }
                        case "character": {
                            const character =
                                await this.characterRepository.findById(doc.id);
                            if (character)
                                content = `Character: ${character.name}\nDescription: ${
                                    character.description
                                }\nTraits: ${character.traits.join(
                                    ", "
                                )}\nGoals: ${character.goals.join(", ")}`;
                            break;
                        }
                        case "location": {
                            const location =
                                await this.locationRepository.findById(doc.id);
                            if (location)
                                content = `Location: ${location.name}\nDescription: ${location.description}`;
                            break;
                        }
                        case "organization": {
                            const org =
                                await this.organizationRepository.findById(
                                    doc.id
                                );
                            if (org)
                                content = `Organization: ${org.name}\nDescription: ${org.description}`;
                            break;
                        }
                        case "scrapNote": {
                            const scrap =
                                await this.scrapNoteRepository.findById(doc.id);
                            if (scrap)
                                content = `Note: ${scrap.title}\n${scrap.content}`;
                            break;
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch document ${doc.id}`, e);
                }

                if (content) {
                    additionalContext += `\n[Document: ${doc.type} - ${doc.id}]\n${content}\n`;
                }
            }
        }

        const chat = client.chats.create({
            model: "gemini-2.5-flash",
            history: history,
            config: {
                systemInstruction: `You are an expert creative writing assistant for a project.
                    Here is the context of the story so far:
                    ${this.formatContext(context)}
                    ${additionalContext}

                    Your goal is to help the author by answering their questions, brainstorming ideas, or drafting content based on this context.`,
            },
        });

        const result = await chat.sendMessageStream({
            message: prompt,
        });

        for await (const chunk of result) {
            yield chunk.text;
        }
    }
}
