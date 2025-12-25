import { IChatConversationRepository } from "../../../domain/repositories/IChatConversationRepository";
import { ChatMessage } from "../../../domain/entities/story/chat/ChatMessage";

export interface LoadChatMessagesRequest {
    conversationId: string;
}

export interface LoadChatMessagesResponse {
    messages: {
        id: string; // We might need to generate a stable ID if not present, but ChatMessage usually has one? Wait, ChatMessage entity doesn't have ID in constructor?
        role: "user" | "assistant";
        content: string;
        timestamp: number;
    }[];
}

export class LoadChatMessages {
    constructor(
        private readonly chatConversationRepository: IChatConversationRepository
    ) {}

    async execute(
        request: LoadChatMessagesRequest
    ): Promise<LoadChatMessagesResponse> {
        const messages = await this.chatConversationRepository.getMessages(
            request.conversationId
        );

        return {
            messages: messages.map((m, index) => ({
                id: `${request.conversationId}-${index}`, // Simple stable ID generation
                role: m.role,
                content: m.content,
                timestamp: m.createdAt.getTime(),
            })),
        };
    }
}
