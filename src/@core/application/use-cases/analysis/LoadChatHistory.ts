import { IChatConversationRepository } from "../../../domain/repositories/IChatConversationRepository";
import { ChatConversation } from "../../../domain/entities/story/chat/ChatConversation";

export interface LoadChatHistoryRequest {
    projectId: string;
}

export interface LoadChatHistoryResponse {
    conversations: {
        id: string;
        title: string | null;
        updatedAt: Date;
    }[];
}

export class LoadChatHistory {
    constructor(
        private readonly chatConversationRepository: IChatConversationRepository
    ) {}

    async execute(
        request: LoadChatHistoryRequest
    ): Promise<LoadChatHistoryResponse> {
        const conversations =
            await this.chatConversationRepository.getConversationsByProjectId(
                request.projectId
            );

        return {
            conversations: conversations.map((c) => ({
                id: c.id,
                title: c.title,
                updatedAt: c.updatedAt,
            })),
        };
    }
}
