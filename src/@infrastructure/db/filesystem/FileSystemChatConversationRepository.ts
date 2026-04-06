import { ChatConversation } from "../../../@core/domain/entities/story/chat/ChatConversation";
import { ChatMessage } from "../../../@core/domain/entities/story/chat/ChatMessage";
import {
    CreateConversationInput,
    IChatConversationRepository,
} from "../../../@core/domain/repositories/IChatConversationRepository";
import { fileSystemService } from "../../storage/FileSystemService";

const joinPath = (...parts: string[]): string => parts.join("/");

type FileSystemConversation = {
    id: string;
    projectId: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
};

type FileSystemMessage = {
    role: "user" | "assistant";
    content: string;
    createdAt: string;
};

const generateConversationId = (): string => {
    const cryptoRef = (globalThis as { crypto?: Crypto }).crypto;
    if (cryptoRef?.randomUUID) {
        return cryptoRef.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export class FileSystemChatConversationRepository implements IChatConversationRepository {
    private getConversationsDirectoryPath(
        userId: string,
        projectId: string,
    ): string {
        return joinPath(
            "users",
            userId,
            "projects",
            projectId,
            "chat",
            "conversations",
        );
    }

    private getConversationFilePath(
        userId: string,
        projectId: string,
        conversationId: string,
    ): string {
        return joinPath(
            this.getConversationsDirectoryPath(userId, projectId),
            `${conversationId}.json`,
        );
    }

    private getMessagesDirectoryPath(
        userId: string,
        projectId: string,
    ): string {
        return joinPath(
            "users",
            userId,
            "projects",
            projectId,
            "chat",
            "messages",
        );
    }

    private getMessagesFilePath(
        userId: string,
        projectId: string,
        conversationId: string,
    ): string {
        return joinPath(
            this.getMessagesDirectoryPath(userId, projectId),
            `${conversationId}.json`,
        );
    }

    async createConversation(
        input: CreateConversationInput,
    ): Promise<ChatConversation> {
        const ownerId = await this.findOwnerIdByProjectId(input.projectId);
        if (!ownerId) {
            throw new Error("Project not found for conversation creation.");
        }

        const id = input.conversationId?.trim() || generateConversationId();
        const now = new Date();

        const dto: FileSystemConversation = {
            id,
            projectId: input.projectId,
            title: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };

        await fileSystemService.writeJson(
            this.getConversationFilePath(ownerId, input.projectId, id),
            dto,
        );

        await fileSystemService.writeJson(
            this.getMessagesFilePath(ownerId, input.projectId, id),
            [] as FileSystemMessage[],
        );

        return this.mapConversation(dto);
    }

    async findById(conversationId: string): Promise<ChatConversation | null> {
        const location = await this.findConversationLocation(conversationId);
        if (!location) {
            return null;
        }

        const dto = await fileSystemService.readJson<FileSystemConversation>(
            location.conversationPath,
        );

        return dto ? this.mapConversation(dto) : null;
    }

    async getConversationsByProjectId(
        projectId: string,
    ): Promise<ChatConversation[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) {
            return [];
        }

        const conversationDir = this.getConversationsDirectoryPath(
            ownerId,
            projectId,
        );
        const files = await fileSystemService.listFiles(conversationDir);
        const conversations: ChatConversation[] = [];

        for (const file of files) {
            if (!file.endsWith(".json")) {
                continue;
            }

            const dto =
                await fileSystemService.readJson<FileSystemConversation>(
                    joinPath(conversationDir, file),
                );
            if (dto) {
                conversations.push(this.mapConversation(dto));
            }
        }

        return conversations.sort(
            (left, right) =>
                right.updatedAt.getTime() - left.updatedAt.getTime(),
        );
    }

    async getMessages(conversationId: string): Promise<ChatMessage[]> {
        const location = await this.findConversationLocation(conversationId);
        if (!location) {
            return [];
        }

        const stored = await fileSystemService.readJson<FileSystemMessage[]>(
            location.messagesPath,
        );

        return (stored ?? []).map(
            (message) =>
                new ChatMessage(
                    conversationId,
                    message.role,
                    message.content,
                    new Date(message.createdAt),
                ),
        );
    }

    async appendMessage(message: ChatMessage): Promise<void> {
        const location = await this.findConversationLocation(
            message.conversationId,
        );
        if (!location) {
            throw new Error("Conversation not found for project.");
        }

        const current =
            (await fileSystemService.readJson<FileSystemMessage[]>(
                location.messagesPath,
            )) ?? [];

        current.push({
            role: message.role,
            content: message.content,
            createdAt: message.createdAt.toISOString(),
        });

        await fileSystemService.writeJson(location.messagesPath, current);

        const conversation =
            await fileSystemService.readJson<FileSystemConversation>(
                location.conversationPath,
            );
        if (conversation) {
            conversation.updatedAt = message.createdAt.toISOString();
            await fileSystemService.writeJson(
                location.conversationPath,
                conversation,
            );
        }
    }

    async updateTitle(conversationId: string, title: string): Promise<void> {
        const location = await this.findConversationLocation(conversationId);
        if (!location) {
            throw new Error("Conversation not found for project.");
        }

        const conversation =
            await fileSystemService.readJson<FileSystemConversation>(
                location.conversationPath,
            );
        if (!conversation) {
            throw new Error("Conversation not found for project.");
        }

        conversation.title = title;
        conversation.updatedAt = new Date().toISOString();
        await fileSystemService.writeJson(
            location.conversationPath,
            conversation,
        );
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) {
            return;
        }

        await fileSystemService.deleteDirectory(
            joinPath("users", ownerId, "projects", projectId, "chat"),
        );
    }

    private async findOwnerIdByProjectId(
        projectId: string,
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");

        for (const userId of users) {
            const projectPath = joinPath(
                "users",
                userId,
                "projects",
                `${projectId}.json`,
            );

            if (await fileSystemService.exists(projectPath)) {
                return userId;
            }
        }

        return null;
    }

    private async findConversationLocation(conversationId: string): Promise<{
        conversationPath: string;
        messagesPath: string;
    } | null> {
        const users = await fileSystemService.listFiles("users");

        for (const userId of users) {
            const projectsDir = joinPath("users", userId, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);

            for (const projectEntry of projects) {
                if (!projectEntry.endsWith(".json")) {
                    continue;
                }

                const projectId = projectEntry.replace(".json", "");
                const conversationPath = this.getConversationFilePath(
                    userId,
                    projectId,
                    conversationId,
                );

                if (!(await fileSystemService.exists(conversationPath))) {
                    continue;
                }

                return {
                    conversationPath,
                    messagesPath: this.getMessagesFilePath(
                        userId,
                        projectId,
                        conversationId,
                    ),
                };
            }
        }

        return null;
    }

    private mapConversation(dto: FileSystemConversation): ChatConversation {
        return new ChatConversation(
            dto.id,
            dto.title,
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
        );
    }
}
