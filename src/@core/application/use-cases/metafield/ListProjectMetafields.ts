import { MetafieldDefinition } from "../../../domain/entities/story/world/MetafieldDefinition";
import { MetafieldAssignment } from "../../../domain/entities/story/world/MetafieldAssignment";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";

export interface ListProjectMetafieldsRequest {
    projectId: string;
}

export interface ListProjectMetafieldsResponse {
    definitions: MetafieldDefinition[];
    assignments: MetafieldAssignment[];
}

export class ListProjectMetafields {
    constructor(
        private readonly definitionRepository: IMetafieldDefinitionRepository,
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: ListProjectMetafieldsRequest,
    ): Promise<ListProjectMetafieldsResponse> {
        const projectId = request.projectId.trim();
        if (!projectId) {
            throw new Error("Project ID is required.");
        }

        const [definitions, assignments] = await Promise.all([
            this.definitionRepository.findByProjectId(projectId),
            this.assignmentRepository.findByProjectId(projectId),
        ]);

        return { definitions, assignments };
    }
}
