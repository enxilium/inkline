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
}

export interface GeneralChatResponse {
    reply: string;
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
            await this.chatConversationRepository.getMessages(
                normalizedProjectId,
                conversation.id
            );
        const context = await this.buildContext(normalizedProjectId);

        const userMessage = new ChatMessage(
            conversation.id,
            "user",
            prompt,
            new Date()
        );
        await this.chatConversationRepository.appendMessage(
            normalizedProjectId,
            userMessage
        );

        const reply = await this.aiTextService.chat(prompt, context, {
            conversationId: conversation.id,
            history: [
                ...existingMessages.map(({ role, content }) => ({
                    role,
                    content,
                })),
                { role: "user", content: prompt },
            ],
        });

        const assistantMessage = new ChatMessage(
            conversation.id,
            "assistant",
            reply,
            new Date()
        );

        await this.chatConversationRepository.appendMessage(
            normalizedProjectId,
            assistantMessage
        );

        return { reply, conversationId: conversation.id };
    }

    private async resolveConversation(
        projectId: string,
        conversationId?: string
    ): Promise<ChatConversation> {
        if (conversationId?.trim()) {
            const conversation = await this.chatConversationRepository.findById(
                projectId,
                conversationId
            );
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
