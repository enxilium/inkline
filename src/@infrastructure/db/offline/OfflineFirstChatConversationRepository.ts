import { ChatConversation } from "../../../@core/domain/entities/story/chat/ChatConversation";
import { ChatMessage } from "../../../@core/domain/entities/story/chat/ChatMessage";
import {
    CreateConversationInput,
    IChatConversationRepository,
} from "../../../@core/domain/repositories/IChatConversationRepository";
import { SupabaseChatConversationRepository } from "../SupabaseChatConversationRepository";
import { FileSystemChatConversationRepository } from "../filesystem/FileSystemChatConversationRepository";

const generateConversationId = (): string => {
    const cryptoRef = (globalThis as { crypto?: Crypto }).crypto;
    if (cryptoRef?.randomUUID) {
        return cryptoRef.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export class OfflineFirstChatConversationRepository implements IChatConversationRepository {
    constructor(
        private readonly supabaseRepo: SupabaseChatConversationRepository,
        private readonly fsRepo: FileSystemChatConversationRepository,
    ) {}

    async createConversation(
        input: CreateConversationInput,
    ): Promise<ChatConversation> {
        const conversationId =
            input.conversationId?.trim() || generateConversationId();

        const local = await this.fsRepo.createConversation({
            ...input,
            conversationId,
        });

        try {
            await this.supabaseRepo.createConversation({
                ...input,
                conversationId,
            });
        } catch (error) {
            console.warn(
                "Failed to create chat conversation in Supabase (Offline?)",
                error,
            );
        }

        return local;
    }

    async findById(conversationId: string): Promise<ChatConversation | null> {
        try {
            const remote = await this.supabaseRepo.findById(conversationId);
            if (remote) {
                return remote;
            }
        } catch {
            // Offline fallback below
        }

        return this.fsRepo.findById(conversationId);
    }

    async getConversationsByProjectId(
        projectId: string,
    ): Promise<ChatConversation[]> {
        try {
            return await this.supabaseRepo.getConversationsByProjectId(
                projectId,
            );
        } catch {
            return this.fsRepo.getConversationsByProjectId(projectId);
        }
    }

    async getMessages(conversationId: string): Promise<ChatMessage[]> {
        try {
            return await this.supabaseRepo.getMessages(conversationId);
        } catch {
            return this.fsRepo.getMessages(conversationId);
        }
    }

    async appendMessage(message: ChatMessage): Promise<void> {
        await this.fsRepo.appendMessage(message);

        try {
            await this.supabaseRepo.appendMessage(message);
        } catch (error) {
            console.warn(
                "Failed to append chat message in Supabase (Offline?)",
                error,
            );
        }
    }

    async updateTitle(conversationId: string, title: string): Promise<void> {
        await this.fsRepo.updateTitle(conversationId, title);

        try {
            await this.supabaseRepo.updateTitle(conversationId, title);
        } catch (error) {
            console.warn(
                "Failed to update chat title in Supabase (Offline?)",
                error,
            );
        }
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        await this.fsRepo.deleteByProjectId(projectId);

        try {
            await this.supabaseRepo.deleteByProjectId(projectId);
        } catch (error) {
            console.warn(
                "Failed to delete chat conversations in Supabase (Offline?)",
                error,
            );
        }
    }
}
