import { ChatConversation } from "../entities/story/chat/ChatConversation";
import { ChatMessage } from "../entities/story/chat/ChatMessage";

export interface CreateConversationInput {
    projectId: string;
}

export interface IChatConversationRepository {
    createConversation(
        input: CreateConversationInput
    ): Promise<ChatConversation>;
    findById(
        projectId: string,
        conversationId: string
    ): Promise<ChatConversation | null>;
    getConversationsByProjectId(projectId: string): Promise<ChatConversation[]>;
    getMessages(
        projectId: string,
        conversationId: string
    ): Promise<ChatMessage[]>;
    appendMessage(projectId: string, message: ChatMessage): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
}
