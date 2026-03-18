import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";

export interface RemoveMetafieldFromEntityRequest {
    definitionId: string;
    entityType: "character" | "location" | "organization";
    entityId: string;
}

export class RemoveMetafieldFromEntity {
    constructor(
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(request: RemoveMetafieldFromEntityRequest): Promise<void> {
        const definitionId = request.definitionId.trim();
        const entityId = request.entityId.trim();

        if (!definitionId) {
            throw new Error("Metafield definition ID is required.");
        }

        if (!entityId) {
            throw new Error("Entity ID is required.");
        }

        const assignment =
            await this.assignmentRepository.findByDefinitionAndEntity(
                definitionId,
                request.entityType,
                entityId,
            );

        if (!assignment) {
            return;
        }

        await this.assignmentRepository.delete(assignment.id);
    }
}
