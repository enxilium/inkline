import {
    MetafieldDefinition,
    MetafieldScope,
    MetafieldValueType,
    MetafieldTargetEntityKind,
} from "../../@core/domain/entities/story/world/MetafieldDefinition";
import { IMetafieldDefinitionRepository } from "../../@core/domain/repositories/IMetafieldDefinitionRepository";
import { SupabaseService } from "./SupabaseService";

type MetafieldDefinitionRow = {
    id: string;
    project_id: string;
    name: string;
    name_normalized: string;
    scope: MetafieldScope;
    value_type: MetafieldValueType;
    target_entity_kind: MetafieldTargetEntityKind | null;
    created_at: string;
    updated_at: string;
};

const mapRowToDefinition = (row: MetafieldDefinitionRow): MetafieldDefinition =>
    new MetafieldDefinition(
        row.id,
        row.project_id,
        row.name,
        row.name_normalized,
        row.scope,
        row.value_type,
        row.target_entity_kind,
        new Date(row.created_at),
        new Date(row.updated_at),
    );

export class SupabaseMetafieldDefinitionRepository implements IMetafieldDefinitionRepository {
    async create(definition: MetafieldDefinition): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("metafield_definitions").insert({
            id: definition.id,
            project_id: definition.projectId,
            name: definition.name,
            name_normalized: definition.nameNormalized,
            scope: definition.scope,
            value_type: definition.valueType,
            target_entity_kind: definition.targetEntityKind,
            created_at: definition.createdAt.toISOString(),
            updated_at: definition.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<MetafieldDefinition | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_definitions")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            return null;
        }

        return mapRowToDefinition(data as MetafieldDefinitionRow);
    }

    async findByProjectId(projectId: string): Promise<MetafieldDefinition[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_definitions")
            .select("*")
            .eq("project_id", projectId)
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as MetafieldDefinitionRow[]).map(mapRowToDefinition);
    }

    async findByProjectAndNameNormalized(
        projectId: string,
        nameNormalized: string,
    ): Promise<MetafieldDefinition | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_definitions")
            .select("*")
            .eq("project_id", projectId)
            .eq("name_normalized", nameNormalized)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return mapRowToDefinition(data as MetafieldDefinitionRow);
    }

    async findByProjectAndScope(
        projectId: string,
        scope: MetafieldScope,
    ): Promise<MetafieldDefinition[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_definitions")
            .select("*")
            .eq("project_id", projectId)
            .eq("scope", scope)
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as MetafieldDefinitionRow[]).map(mapRowToDefinition);
    }

    async update(definition: MetafieldDefinition): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("metafield_definitions")
            .update({
                name: definition.name,
                name_normalized: definition.nameNormalized,
                scope: definition.scope,
                value_type: definition.valueType,
                target_entity_kind: definition.targetEntityKind,
                updated_at: definition.updatedAt.toISOString(),
            })
            .eq("id", definition.id);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("metafield_definitions")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message);
    }
}
