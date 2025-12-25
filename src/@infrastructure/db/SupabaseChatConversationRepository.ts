import { ChatConversation } from "../../@core/domain/entities/story/chat/ChatConversation";
import { ChatMessage } from "../../@core/domain/entities/story/chat/ChatMessage";
import {
    CreateConversationInput,
    IChatConversationRepository,
} from "../../@core/domain/repositories/IChatConversationRepository";
import { SupabaseService } from "./SupabaseService";

type ChatConversationRow = {
    id: string;
    project_id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
};

type ChatMessageRow = {
    id: string;
    conversation_id: string;
    role: "user" | "assistant";
    content: string;
    created_at: string;
};

const mapConversationRow = (row: ChatConversationRow): ChatConversation =>
    new ChatConversation(
        row.id,
        row.title,
        new Date(row.created_at),
        new Date(row.updated_at)
    );

const mapMessageRow = (row: ChatMessageRow): ChatMessage =>
    new ChatMessage(
        row.conversation_id,
        row.role,
        row.content,
        new Date(row.created_at)
    );

export class SupabaseChatConversationRepository
    implements IChatConversationRepository
{
    async createConversation(
        input: CreateConversationInput
    ): Promise<ChatConversation> {
        const client = SupabaseService.getClient();
        const now = new Date().toISOString();
        const { data, error } = await client
            .from("chat_conversations")
            .insert({
                project_id: input.projectId,
                title: null,
                created_at: now,
                updated_at: now,
            })
            .select("*")
            .single();

        if (error || !data) {
            throw new Error(
                error?.message ?? "Unable to create chat conversation."
            );
        }

        return mapConversationRow(data as ChatConversationRow);
    }

    async findById(id: string): Promise<ChatConversation | null> {
        const row = await this.fetchConversationRow(id);
        return row ? mapConversationRow(row) : null;
    }

    async getConversationsByProjectId(
        projectId: string
    ): Promise<ChatConversation[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("chat_conversations")
            .select("*")
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as ChatConversationRow[]).map(mapConversationRow);
    }

    async getMessages(conversationId: string): Promise<ChatMessage[]> {
        const conversation = await this.fetchConversationRow(conversationId);

        if (!conversation) {
            return [];
        }

        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as ChatMessageRow[]).map(mapMessageRow);
    }

    async appendMessage(message: ChatMessage): Promise<void> {
        const conversation = await this.fetchConversationRow(
            message.conversationId
        );

        if (!conversation) {
            throw new Error("Conversation not found for project.");
        }

        const client = SupabaseService.getClient();
        const timestamp = message.createdAt.toISOString();
        const { error } = await client.from("chat_messages").insert({
            conversation_id: message.conversationId,
            role: message.role,
            content: message.content,
            created_at: timestamp,
        });

        if (error) throw new Error(error.message);

        const { error: updateError } = await client
            .from("chat_conversations")
            .update({ updated_at: timestamp })
            .eq("id", message.conversationId);

        if (updateError) throw new Error(updateError.message);
    }

    async updateTitle(conversationId: string, title: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("chat_conversations")
            .update({ title, updated_at: new Date().toISOString() })
            .eq("id", conversationId);

        if (error) throw new Error(error.message);
    }

    private async fetchConversationRow(
        id: string
    ): Promise<ChatConversationRow | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("chat_conversations")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            return null;
        }

        return data as ChatConversationRow;
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("chat_conversations")
            .delete()
            .eq("project_id", projectId);
        if (error) throw new Error(error.message);
    }
}
