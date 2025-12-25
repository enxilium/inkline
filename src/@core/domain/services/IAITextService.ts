import { ChatMessageRole } from "../entities/story/chat/ChatMessage";
import { NarrativeContext } from "./NarrativeContext";

export interface ChatHistoryItem {
    role: ChatMessageRole;
    content: string;
}

export interface ChatHistoryOptions {
    conversationId?: string;
    history?: ChatHistoryItem[];
    contextDocuments?: {
        type:
            | "chapter"
            | "character"
            | "location"
            | "organization"
            | "scrapNote"
            | "text";
        id: string;
        content?: string;
    }[];
}

export interface IAITextService {
    /**
     * Analyzes text for grammar, style, or plot holes.
     * @param content The text content to analyze.
     * @param instruction Specific instruction for the analysis (e.g. "Can I make this part better").
     * @param context Narrative context describing the manuscript state.
     */
    analyze(
        content: string,
        instruction: string,
        context: NarrativeContext
    ): AsyncGenerator<string, void, unknown>;

    /**
     * Holistic AI editing for a set of chapters.
     * @param projectId The ID of the project.
     * @param chapterIds The IDs of the chapters to edit.
     * @param context Narrative context describing the manuscript state.
     */
    editManuscript(
        chapterIds: string[],
        context: NarrativeContext
    ): Promise<{
        /**
         * General editorial comments.
         * - If chapter-level: omit wordNumberStart/wordNumberEnd/originalText.
         * - If range-level: word indices are inclusive and 1-based.
         */
        comments: {
            chapterId: string;
            comment: string;
            wordNumberStart?: number;
            wordNumberEnd?: number;
            originalText?: string;
        }[];

        /**
         * Suggested replacements.
         * Word indices are inclusive and 1-based.
         */
        replacements: {
            chapterId: string;
            wordNumberStart: number;
            wordNumberEnd: number;
            originalText: string;
            replacementText: string;
            comment?: string;
        }[];
    }>;

    /**
     * Begins or continues a chat conversation with the AI about the story.
     * @param prompt The prompt for generation.
     * @param context Narrative context describing the manuscript state.
     * @param options Conversation metadata so the implementation can maintain history.
     */
    chat(
        prompt: string,
        context: NarrativeContext,
        options?: ChatHistoryOptions
    ): AsyncGenerator<string, void, unknown>;

    startChatWithTitle(
        prompt: string,
        context: NarrativeContext,
        options?: ChatHistoryOptions
    ): Promise<{ title: string; reply: string }>;
}
