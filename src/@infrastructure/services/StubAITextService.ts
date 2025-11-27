import {
    ChatHistoryOptions,
    IAITextService,
} from "../../@core/domain/services/IAITextService";
import { NarrativeContext } from "../../@core/domain/services/NarrativeContext";

const NOT_IMPLEMENTED_MESSAGE =
    "AI text features are not available in the current build.";

export class StubAITextService implements IAITextService {
    async analyze(
        _content: string,
        _instruction: string,
        _context: NarrativeContext
    ): Promise<string> {
        return NOT_IMPLEMENTED_MESSAGE;
    }

    async editManuscript(
        _chapterRange: { start: number; end: number },
        _context: NarrativeContext
    ): Promise<
        { chapterNumber: number; wordNumber: number; comment: string }[]
    > {
        return [];
    }

    async chat(
        prompt: string,
        _context: NarrativeContext,
        _options?: ChatHistoryOptions
    ): Promise<string> {
        const sanitizedPrompt = prompt.trim();
        if (!sanitizedPrompt) {
            return NOT_IMPLEMENTED_MESSAGE;
        }

        return `${NOT_IMPLEMENTED_MESSAGE}\n\nPrompt:\n${sanitizedPrompt}`;
    }
}
