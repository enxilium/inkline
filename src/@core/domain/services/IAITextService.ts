import { ChatMessageRole } from "../entities/story/chat/ChatMessage";
import { NarrativeContext } from "./NarrativeContext";

export interface ChatHistoryItem {
    role: ChatMessageRole;
    content: string;
}

export interface ChatHistoryOptions {
    conversationId?: string;
    history?: ChatHistoryItem[];
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
    ): Promise<string>;

    /**
     * Holistic AI editing for a set chapter range.
     * @param chapterRange The inclusive range of chapters to edit.
     * @param context Narrative context describing the manuscript state.
     */
    editManuscript(
        chapterRange: {
            start: number;
            end: number;
        },
        context: NarrativeContext
    ): Promise<
        { chapterNumber: number; wordNumber: number; comment: string }[]
    >;

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
    ): Promise<string>;
}
