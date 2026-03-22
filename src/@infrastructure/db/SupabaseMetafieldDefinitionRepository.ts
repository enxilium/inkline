import {
    MetafieldDefinition,
    MetafieldSelectOption,
    MetafieldScope,
    MetafieldValueType,
    MetafieldTargetEntityKind,
} from "../../@core/domain/entities/story/world/MetafieldDefinition";
import { IMetafieldDefinitionRepository } from "../../@core/domain/repositories/IMetafieldDefinitionRepository";
import { normalizeMetafieldName } from "../../@core/application/utils/normalizeMetafieldName";
import { SupabaseService } from "./SupabaseService";

type MetafieldDefinitionRow = {
    id: string;
    project_id: string;
    name: string;
    name_normalized: string;
    scope: MetafieldScope;
    value_type: MetafieldValueType;
    target_entity_kind: MetafieldTargetEntityKind | null;
    select_options_json: unknown;
    created_at: string;
    updated_at: string;
};

type PersistedSelectOption = {
    id: string;
    label: string;
    label_normalized: string;
    order_index: number;
    icon?: string;
    created_at: string;
    updated_at: string;
};

const toPersistedSelectOptions = (
    options: MetafieldSelectOption[],
): PersistedSelectOption[] =>
    options
        .slice()
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((option) => ({
            id: option.id,
            label: option.label,
            label_normalized: option.labelNormalized,
            order_index: option.orderIndex,
            ...(option.icon ? { icon: option.icon } : {}),
            created_at: option.createdAt.toISOString(),
            updated_at: option.updatedAt.toISOString(),
        }));

const mapPersistedSelectOptions = (value: unknown): MetafieldSelectOption[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    const options: MetafieldSelectOption[] = [];
    for (const entry of value) {
        if (!entry || typeof entry !== "object") {
            continue;
        }

        const raw = entry as Partial<PersistedSelectOption>;
        if (
            typeof raw.id !== "string" ||
            typeof raw.label !== "string" ||
            typeof raw.label_normalized !== "string" ||
            typeof raw.order_index !== "number" ||
            typeof raw.created_at !== "string" ||
            typeof raw.updated_at !== "string"
        ) {
            continue;
        }

        options.push({
            id: raw.id,
            label: raw.label,
            labelNormalized: raw.label_normalized,
            orderIndex: raw.order_index,
            ...(typeof raw.icon === "string" && raw.icon.trim()
                ? { icon: raw.icon.trim() }
                : {}),
            createdAt: new Date(raw.created_at),
            updatedAt: new Date(raw.updated_at),
        });
    }

    return options.sort((left, right) => left.orderIndex - right.orderIndex);
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
        mapPersistedSelectOptions(row.select_options_json),
        new Date(row.created_at),
        new Date(row.updated_at),
    );

export class SupabaseMetafieldDefinitionRepository implements IMetafieldDefinitionRepository {
    async create(definition: MetafieldDefinition): Promise<void> {
        const normalized = normalizeMetafieldName(definition.name);
        const client = SupabaseService.getClient();
        const { error } = await client.from("metafield_definitions").insert({
            id: definition.id,
            project_id: definition.projectId,
            name: definition.name,
            name_normalized: normalized,
            scope: definition.scope,
            value_type: definition.valueType,
            target_entity_kind: definition.targetEntityKind,
            select_options_json: toPersistedSelectOptions(
                definition.selectOptions,
            ),
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
        const normalized = normalizeMetafieldName(nameNormalized);
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("metafield_definitions")
            .select("*")
            .eq("project_id", projectId)
            .eq("name_normalized", normalized)
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
        const normalized = normalizeMetafieldName(definition.name);
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("metafield_definitions")
            .update({
                name: definition.name,
                name_normalized: normalized,
                scope: definition.scope,
                value_type: definition.valueType,
                target_entity_kind: definition.targetEntityKind,
                select_options_json: toPersistedSelectOptions(
                    definition.selectOptions,
                ),
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
