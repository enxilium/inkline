import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IChatConversationRepository } from "../../../domain/repositories/IChatConversationRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IAITextService } from "../../../domain/services/IAITextService";
import { NarrativeContext } from "../../../domain/services/NarrativeContext";
import { ChatConversation } from "../../../domain/entities/story/chat/ChatConversation";
import { ChatMessage } from "../../../domain/entities/story/chat/ChatMessage";
import { buildNarrativeContext } from "../../utils/narrativeContext";

export interface GeneralChatRequest {
    projectId: string;
    prompt: string;
    conversationId?: string;
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

export interface GeneralChatResponse {
    stream: AsyncGenerator<string, void, unknown>;
    conversationId: string;
}

export class GeneralChat {
    constructor(
        private readonly aiTextService: IAITextService,
        private readonly chapterRepository: IChapterRepository,
        private readonly characterRepository: ICharacterRepository,
        private readonly locationRepository: ILocationRepository,
        private readonly organizationRepository: IOrganizationRepository,
        private readonly chatConversationRepository: IChatConversationRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(request: GeneralChatRequest): Promise<GeneralChatResponse> {
        const { projectId, prompt, conversationId } = request;
        const normalizedProjectId = projectId.trim();

        if (!normalizedProjectId) {
            throw new Error("Project ID is required.");
        }

        if (!prompt.trim()) {
            throw new Error("Prompt is required for chatting with the AI.");
        }

        await this.ensureProjectExists(normalizedProjectId);

        const conversation = await this.resolveConversation(
            normalizedProjectId,
            conversationId
        );
        const existingMessages =
            await this.chatConversationRepository.getMessages(conversation.id);
        const context = await this.buildContext(normalizedProjectId);

        const userMessage = new ChatMessage(
            conversation.id,
            "user",
            prompt,
            new Date()
        );
        await this.chatConversationRepository.appendMessage(userMessage);

        // Check if this is the first message (or if we should generate a title)
        // We assume if existingMessages is empty, it's a new chat.
        if (existingMessages.length === 0) {
            const { title, reply } =
                await this.aiTextService.startChatWithTitle(prompt, context, {
                    conversationId: conversation.id,
                    contextDocuments: request.contextDocuments,
                });

            // Update title
            await this.chatConversationRepository.updateTitle(
                conversation.id,
                title
            );

            // Save assistant message
            const assistantMessage = new ChatMessage(
                conversation.id,
                "assistant",
                reply,
                new Date()
            );
            await this.chatConversationRepository.appendMessage(
                assistantMessage
            );

            // Create a generator that yields the single reply chunk
            const singleChunkStream = (async function* () {
                yield reply;
            })();

            return {
                stream: singleChunkStream,
                conversationId: conversation.id,
            };
        }

        const stream = this.aiTextService.chat(prompt, context, {
            conversationId: conversation.id,
            history: [
                ...existingMessages.map(({ role, content }) => ({
                    role,
                    content,
                })),
                { role: "user", content: prompt },
            ],
            contextDocuments: request.contextDocuments,
        });

        const wrappedStream = (async function* (
            repo: IChatConversationRepository,
            projectId: string,
            convId: string
        ) {
            let fullReply = "";
            for await (const chunk of stream) {
                fullReply += chunk;
                yield chunk;
            }

            const assistantMessage = new ChatMessage(
                convId,
                "assistant",
                fullReply,
                new Date()
            );
            await repo.appendMessage(assistantMessage);
        })(
            this.chatConversationRepository,
            normalizedProjectId,
            conversation.id
        );

        return { stream: wrappedStream, conversationId: conversation.id };
    }

    private async resolveConversation(
        projectId: string,
        conversationId?: string
    ): Promise<ChatConversation> {
        if (conversationId?.trim()) {
            const conversation =
                await this.chatConversationRepository.findById(conversationId);
            if (!conversation) {
                throw new Error("Conversation not found for this project.");
            }
            return conversation;
        }

        return this.chatConversationRepository.createConversation({
            projectId,
        });
    }

    private async buildContext(projectId: string): Promise<NarrativeContext> {
        const [
            chapters,
            characterProfiles,
            locationProfiles,
            organizationProfiles,
        ] = await Promise.all([
            this.chapterRepository.findByProjectId(projectId),
            this.characterRepository.getCharacterProfiles(projectId),
            this.locationRepository.getLocationProfiles(projectId),
            this.organizationRepository.getOrganizationProfiles(projectId),
        ]);
        return buildNarrativeContext(
            chapters,
            characterProfiles,
            locationProfiles,
            organizationProfiles
        );
    }

    private async ensureProjectExists(projectId: string): Promise<void> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }
    }
}
