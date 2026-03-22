import { Character } from "../../../domain/entities/story/world/Character";
import { MetafieldAssignment } from "../../../domain/entities/story/world/MetafieldAssignment";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IEditorTemplateRepository } from "../../../domain/repositories/IEditorTemplateRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateCharacterRequest {
    projectId: string;
    /** Optional client-generated ID used for optimistic UI flows. */
    id?: string;
}

export interface CreateCharacterResponse {
    character: Character;
}

export class CreateCharacter {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly editorTemplateRepository: IEditorTemplateRepository,
        private readonly metafieldDefinitionRepository: IMetafieldDefinitionRepository,
        private readonly metafieldAssignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: CreateCharacterRequest,
    ): Promise<CreateCharacterResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error("Project ID is required for character creation.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = request.id?.trim() || generateId();
        const character = new Character(
            id,
            "",
            "",
            null,
            null,
            null,
            null,
            null,
            [],
            now,
            now,
        );

        await this.characterRepository.create(projectId, character);

        const editorTemplate =
            await this.editorTemplateRepository.findByProjectAndEditorType(
                projectId,
                "character",
            );

        if (!editorTemplate) {
            throw new Error("Character template is missing for this project.");
        }

        await this.seedCharacterMetafieldsFromTemplate(
            projectId,
            id,
            now,
            editorTemplate.fields,
        );

        if (!project.characterIds.includes(id)) {
            project.characterIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { character };
    }

    private async seedCharacterMetafieldsFromTemplate(
        projectId: string,
        characterId: string,
        now: Date,
        fields: Array<{
            definitionId: string;
            kind: "field" | "paragraph" | "select";
            orderIndex: number;
        }>,
    ): Promise<void> {
        const orderedFields = [...fields].sort(
            (a, b) => a.orderIndex - b.orderIndex,
        );

        let orderIndex = 0;
        for (const field of orderedFields) {
            const definition =
                await this.metafieldDefinitionRepository.findById(
                    field.definitionId,
                );

            if (!definition || definition.projectId !== projectId) {
                continue;
            }

            const assignment = new MetafieldAssignment(
                generateId(),
                projectId,
                definition.id,
                "character",
                characterId,
                field.kind === "select"
                    ? { kind: field.kind, value: [] as string[] }
                    : { kind: field.kind, value: "" },
                orderIndex,
                now,
                now,
            );

            await this.metafieldAssignmentRepository.create(assignment);
            orderIndex += 1;
        }
    }

}
