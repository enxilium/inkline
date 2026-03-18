import {
    MetafieldAssignment,
    MetafieldAssignableEntityType,
} from "../../@core/domain/entities/story/world/MetafieldAssignment";
import { IMetafieldAssignmentRepository } from "../../@core/domain/repositories/IMetafieldAssignmentRepository";
import { SupabaseService } from "./SupabaseService";

type MetafieldAssignmentRow = {
    id: string;
    project_id: string;
    definition_id: string;
    entity_type: MetafieldAssignableEntityType;
    entity_id: string;
    value_json: unknown;
    order_index: number;
    created_at: string;
    updated_at: string;
};

const mapRowToAssignment = (row: MetafieldAssignmentRow): MetafieldAssignment =>
    new MetafieldAssignment(
        row.id,
        row.project_id,
        row.definition_id,
        row.entity_type,
        row.entity_id,
        row.value_json,
        row.order_index ?? 0,
        new Date(row.created_at),
        new Date(row.updated_at),
    );

export class SupabaseMetafieldAssignmentRepository implements IMetafieldAssignmentRepository {
    async create(assignment: MetafieldAssignment): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("metafield_assignments").insert({
            id: assignment.id,
            project_id: assignment.projectId,
            definition_id: assignment.definitionId,
            entity_type: assignment.entityType,
            entity_id: assignment.entityId,
            value_json: assignment.valueJson,
            order_index: assignment.orderIndex,
            created_at: assignment.createdAt.toISOString(),
            updated_at: assignment.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<MetafieldAssignment | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_assignments")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) {
            return null;
        }

        return mapRowToAssignment(data as MetafieldAssignmentRow);
    }

    async findByProjectId(projectId: string): Promise<MetafieldAssignment[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_assignments")
            .select("*")
            .eq("project_id", projectId)
            .order("order_index", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as MetafieldAssignmentRow[]).map(mapRowToAssignment);
    }

    async findByDefinitionId(
        definitionId: string,
    ): Promise<MetafieldAssignment[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_assignments")
            .select("*")
            .eq("definition_id", definitionId)
            .order("order_index", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as MetafieldAssignmentRow[]).map(mapRowToAssignment);
    }

    async findByEntity(
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_assignments")
            .select("*")
            .eq("entity_type", entityType)
            .eq("entity_id", entityId)
            .order("order_index", { ascending: true })
            .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as MetafieldAssignmentRow[]).map(mapRowToAssignment);
    }

    async findByDefinitionAndEntity(
        definitionId: string,
        entityType: MetafieldAssignableEntityType,
        entityId: string,
    ): Promise<MetafieldAssignment | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_assignments")
            .select("*")
            .eq("definition_id", definitionId)
            .eq("entity_type", entityType)
            .eq("entity_id", entityId)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return mapRowToAssignment(data as MetafieldAssignmentRow);
    }

    async update(assignment: MetafieldAssignment): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("metafield_assignments")
            .update({
                value_json: assignment.valueJson,
                order_index: assignment.orderIndex,
                updated_at: assignment.updatedAt.toISOString(),
            })
            .eq("id", assignment.id);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("metafield_assignments")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message);
    }

    async deleteByDefinitionId(definitionId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("metafield_assignments")
            .delete()
            .eq("definition_id", definitionId);

        if (error) throw new Error(error.message);
    }
}
