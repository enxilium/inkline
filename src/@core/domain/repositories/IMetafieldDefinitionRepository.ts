import {
    MetafieldDefinition,
    MetafieldScope,
} from "../entities/story/world/MetafieldDefinition";

export interface IMetafieldDefinitionRepository {
    create(definition: MetafieldDefinition): Promise<void>;
    findById(id: string): Promise<MetafieldDefinition | null>;
    findByProjectId(projectId: string): Promise<MetafieldDefinition[]>;
    findByProjectAndNameNormalized(
        projectId: string,
        nameNormalized: string,
    ): Promise<MetafieldDefinition | null>;
    findByProjectAndScope(
        projectId: string,
        scope: MetafieldScope,
    ): Promise<MetafieldDefinition[]>;
    update(definition: MetafieldDefinition): Promise<void>;
    delete(id: string): Promise<void>;
}
