import {
    MetafieldAssignment,
    MetafieldAssignableEntityType,
} from "../entities/story/world/MetafieldAssignment";

export interface IMetafieldAssignmentRepository {
    create(assignment: MetafieldAssignment): Promise<void>;
    findById(id: string): Promise<MetafieldAssignment | null>;
    findByProjectId(projectId: string): Promise<MetafieldAssignment[]>;
    findByDefinitionId(definitionId: string): Promise<MetafieldAssignment[]>;
    findByEntity(
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment[]>;
    findByDefinitionAndEntity(
        definitionId: string,
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment | null>;
    update(assignment: MetafieldAssignment): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByDefinitionId(definitionId: string): Promise<void>;
}
