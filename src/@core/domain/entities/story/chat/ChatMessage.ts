/**
 * ChatMessage captures a single turn in a chat conversation.
 */
export type ChatMessageRole = "user" | "assistant";

export class ChatMessage {
    constructor(
        public conversationId: string,
        public role: ChatMessageRole,
        public content: string,
        public createdAt: Date
    ) {}
}
