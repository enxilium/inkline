import { GoogleGenAI, Content, ThinkingLevel } from "@google/genai";
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
import {
    extractPlainText,
    sanitizeReplacementTextForEdits,
    splitWordsForEditIndexing,
} from "../../@core/application/utils/tiptapText";

const EDIT_MODEL = "gemini-3-flash-preview";

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
            model: "gemini-3-flash-preview",
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
    ): Promise<{
        comments: {
            chapterId: string;
            comment: string;
            wordNumberStart?: number;
            wordNumberEnd?: number;
            originalText?: string;
        }[];
        replacements: {
            chapterId: string;
            wordNumberStart: number;
            wordNumberEnd: number;
            originalText: string;
            replacementText: string;
            comment?: string;
        }[];
    }> {
        const client = await this.getModel();
        const contextStr = this.formatContext(context);

        // Fetch chapters
        const chapters = await Promise.all(
            chapterIds.map((id) => this.chapterRepository.findById(id))
        );

        const validChapters = chapters.filter(
            (c): c is NonNullable<typeof c> => c !== null
        );
        if (validChapters.length === 0) {
            return { comments: [], replacements: [] };
        }

        const tokensByChapterId = new Map<string, string[]>();

        const manuscriptContent = validChapters
            .map((c) => {
                const plainText = extractPlainText(c.content);
                const tokens = splitWordsForEditIndexing(plainText);
                tokensByChapterId.set(c.id, tokens);
                const numberedWords =
                    tokens.length === 0
                        ? ""
                        : tokens
                              .map((word, index) => `${index + 1}: ${word}`)
                              .join("\n");
                return `--- CHAPTER ID: ${c.id} ---\nTitle: ${c.title}\nWords (1-based index => token):\n${numberedWords}`;
            })
            .join("\n\n");

        const systemInstruction = `You are an expert editor.

    Your task: review the provided manuscript chapters and return two kinds of edits:
    1) General comments (may be chapter-level or anchored to a specific text range)
    2) Text replacements (Google Docs-style “replace X with Y”)

        IMPORTANT word indexing rules:
        - You are given each chapter as numbered word tokens: "1: <token>", "2: <token>", etc.
        - Tokens are WORDS ONLY. They intentionally exclude surrounding punctuation.
            (Example: the text "Hello," would be tokenized as "Hello".)
    - If you include a range, word indices are INCLUSIVE and 1-based.
    - wordNumberStart and wordNumberEnd refer to these exact token numbers, relative to the start of THAT chapter.
    - Do NOT estimate word boundaries from prose. Use the provided numbering.

        Output requirements:
    - Return STRICT JSON (no markdown, no prose) matching the provided response schema.
        - For range-level items, include originalText EXACTLY as the concatenation of tokens wordNumberStart..wordNumberEnd joined by single spaces.
            (This means originalText must be derivable directly from the numbered tokens and MUST NOT include punctuation.)
    - For chapter-level comments, omit wordNumberStart, wordNumberEnd, and originalText.
    - For replacements, comment is optional (may be empty or omitted).
    - For replacements, replacementText MUST NOT include punctuation. Use words only (letters/numbers/spaces, apostrophes/hyphens allowed).`;

        const prompt = `
            --- NARRATIVE CONTEXT ---
            ${contextStr}

            --- MANUSCRIPT CONTENT ---
            ${manuscriptContent}

            Please review the manuscript and provide comments.`;

        const result = await client.models.generateContent({
            model: EDIT_MODEL,
            contents: prompt,
            config: {
                thinkingConfig: {
                    thinkingLevel: ThinkingLevel.HIGH,
                },
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        comments: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    chapterId: { type: "STRING" },
                                    comment: { type: "STRING" },
                                    wordNumberStart: { type: "NUMBER" },
                                    wordNumberEnd: { type: "NUMBER" },
                                    originalText: { type: "STRING" },
                                },
                                required: ["chapterId", "comment"],
                            },
                        },
                        replacements: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    chapterId: { type: "STRING" },
                                    wordNumberStart: { type: "NUMBER" },
                                    wordNumberEnd: { type: "NUMBER" },
                                    originalText: { type: "STRING" },
                                    replacementText: { type: "STRING" },
                                    comment: { type: "STRING" },
                                },
                                required: [
                                    "chapterId",
                                    "wordNumberStart",
                                    "wordNumberEnd",
                                    "originalText",
                                    "replacementText",
                                ],
                            },
                        },
                    },
                    required: ["comments", "replacements"],
                },
            },
        });

        try {
            const text = result.text;
            if (text) {
                const parsed = JSON.parse(text) as {
                    comments?: unknown;
                    replacements?: unknown;
                };

                const asRecord = (
                    value: unknown
                ): Record<string, unknown> | null => {
                    if (!value || typeof value !== "object") {
                        return null;
                    }
                    return value as Record<string, unknown>;
                };

                const rawComments = Array.isArray(parsed.comments)
                    ? (parsed.comments as unknown[])
                    : [];
                const rawReplacements = Array.isArray(parsed.replacements)
                    ? (parsed.replacements as unknown[])
                    : [];

                const comments = rawComments
                    .map((item) => {
                        const rec = asRecord(item);
                        if (!rec) {
                            return null;
                        }

                        const chapterId =
                            typeof rec["chapterId"] === "string"
                                ? (rec["chapterId"] as string)
                                : null;
                        const comment =
                            typeof rec["comment"] === "string"
                                ? (rec["comment"] as string)
                                : "";
                        if (!chapterId || !comment) {
                            return null;
                        }

                        const start =
                            typeof rec["wordNumberStart"] === "number"
                                ? (rec["wordNumberStart"] as number)
                                : undefined;
                        const end =
                            typeof rec["wordNumberEnd"] === "number"
                                ? (rec["wordNumberEnd"] as number)
                                : undefined;

                        // Chapter-level comment
                        if (!start || !end) {
                            return { chapterId, comment };
                        }

                        const tokens = tokensByChapterId.get(chapterId);
                        if (
                            !tokens ||
                            start < 1 ||
                            end < start ||
                            end > tokens.length
                        ) {
                            // Degrade invalid ranged comment into a chapter-level comment.
                            return { chapterId, comment };
                        }

                        return {
                            chapterId,
                            comment,
                            wordNumberStart: start,
                            wordNumberEnd: end,
                            // Enforce exact token-span text to avoid LLM formatting drift.
                            originalText: tokens
                                .slice(start - 1, end)
                                .join(" "),
                        };
                    })
                    .filter(Boolean) as {
                    chapterId: string;
                    comment: string;
                    wordNumberStart?: number;
                    wordNumberEnd?: number;
                    originalText?: string;
                }[];

                const replacements = rawReplacements
                    .map((item) => {
                        const rec = asRecord(item);
                        if (!rec) {
                            return null;
                        }

                        const chapterId =
                            typeof rec["chapterId"] === "string"
                                ? (rec["chapterId"] as string)
                                : null;
                        const start =
                            typeof rec["wordNumberStart"] === "number"
                                ? (rec["wordNumberStart"] as number)
                                : null;
                        const end =
                            typeof rec["wordNumberEnd"] === "number"
                                ? (rec["wordNumberEnd"] as number)
                                : null;
                        const replacementText =
                            typeof rec["replacementText"] === "string"
                                ? (rec["replacementText"] as string)
                                : null;
                        const comment =
                            typeof rec["comment"] === "string"
                                ? (rec["comment"] as string)
                                : undefined;

                        if (!chapterId || !start || !end || !replacementText) {
                            return null;
                        }

                        const sanitizedReplacementText =
                            sanitizeReplacementTextForEdits(replacementText);
                        if (!sanitizedReplacementText) {
                            return null;
                        }

                        const tokens = tokensByChapterId.get(chapterId);
                        if (
                            !tokens ||
                            start < 1 ||
                            end < start ||
                            end > tokens.length
                        ) {
                            return null;
                        }

                        return {
                            chapterId,
                            wordNumberStart: start,
                            wordNumberEnd: end,
                            // Enforce exact token-span text to avoid LLM formatting drift.
                            originalText: tokens
                                .slice(start - 1, end)
                                .join(" "),
                            replacementText: sanitizedReplacementText,
                            comment,
                        };
                    })
                    .filter(Boolean) as {
                    chapterId: string;
                    wordNumberStart: number;
                    wordNumberEnd: number;
                    originalText: string;
                    replacementText: string;
                    comment?: string;
                }[];

                return { comments, replacements };
            }
        } catch (e) {
            console.error("Failed to parse JSON response", e);
        }

        return { comments: [], replacements: [] };
    }

    async startChatWithTitle(
        prompt: string,
        context: NarrativeContext,
        options?: ChatHistoryOptions
    ): Promise<{ title: string; reply: string }> {
        const client = await this.getModel();
        const contextStr = this.formatContext(context);

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
                        case "text": {
                            if (doc.content) {
                                content = `Excerpt (${doc.id}):\n${doc.content}`;
                            }
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

        const systemInstruction = `You are an expert creative writing assistant for a project.
            Here is the context of the story so far:
            ${contextStr}
            ${additionalContext}

            Your goal is to help the author by answering their questions, brainstorming ideas, or drafting content based on this context.

            IMPORTANT: This is the first message in a new conversation.
            You MUST return a JSON object containing:
            1. "reply": Your normal helpful response to the user's prompt.
            2. "title": A short, concise title (3-6 words) summarizing this conversation topic based on the prompt and your reply.`;

        const result = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        reply: { type: "STRING" },
                        title: { type: "STRING" },
                    },
                    required: ["reply", "title"],
                },
            },
        });

        try {
            const text = result.text;
            if (text) {
                const parsed = JSON.parse(text) as {
                    reply: string;
                    title: string;
                };
                return parsed;
            }
        } catch (e) {
            console.error("Failed to parse JSON response for startChat", e);
        }

        // Fallback if JSON parsing fails
        return {
            title: "New Conversation",
            reply: result.text || "I'm sorry, I couldn't process that.",
        };
    }

    async *chat(
        prompt: string,
        context: NarrativeContext,
        options?: ChatHistoryOptions
    ): AsyncGenerator<string, void, unknown> {
        const client = await this.getModel();

        let history: Content[] = [];
        if (options?.history) {
            // Filter out the last message if it matches the current prompt to avoid duplication
            // because the caller (GeneralChat) appends the current prompt to history.
            const historyToUse = options.history.slice(0, -1);

            history = historyToUse.map((h) => ({
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
                        case "text": {
                            if (doc.content) {
                                content = `Excerpt (${doc.id}):\n${doc.content}`;
                            }
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
