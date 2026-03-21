import { Organization } from "../../../domain/entities/story/world/Organization";
import { MetafieldAssignment } from "../../../domain/entities/story/world/MetafieldAssignment";
import { IEditorTemplateRepository } from "../../../domain/repositories/IEditorTemplateRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateOrganizationRequest {
    projectId: string;
    /** Optional client-generated ID used for optimistic UI flows. */
    id?: string;
}

export interface CreateOrganizationResponse {
    organization: Organization;
}

export class CreateOrganization {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly editorTemplateRepository: IEditorTemplateRepository,
        private readonly metafieldDefinitionRepository: IMetafieldDefinitionRepository,
        private readonly metafieldAssignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: CreateOrganizationRequest,
    ): Promise<CreateOrganizationResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error(
                "Project ID is required for organization creation.",
            );
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = request.id?.trim() || generateId();
        const organization = new Organization(
            id,
            "",
            "",
            [],
            [],
            null,
            null,
            now,
            now,
        );

        await this.organizationRepository.create(projectId, organization);

        const editorTemplate =
            await this.editorTemplateRepository.findByProjectAndEditorType(
                projectId,
                "organization",
            );

        if (!editorTemplate) {
            throw new Error(
                "Organization template is missing for this project.",
            );
        }

        await this.seedOrganizationMetafieldsFromTemplate(
            projectId,
            id,
            now,
            editorTemplate.fields,
        );

        if (!project.organizationIds.includes(id)) {
            project.organizationIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { organization };
    }

    private async seedOrganizationMetafieldsFromTemplate(
        projectId: string,
        organizationId: string,
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
                "organization",
                organizationId,
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
