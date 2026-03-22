import {
    EditorTemplate,
    EditorTemplateField,
    EditorTemplatePlacement,
    EditorTemplateType,
} from "../../@core/domain/entities/story/world/EditorTemplate";
import { IEditorTemplateRepository } from "../../@core/domain/repositories/IEditorTemplateRepository";
import { SupabaseService } from "./SupabaseService";

type EditorTemplateRow = {
    id: string;
    project_id: string;
    editor_type: EditorTemplateType;
    placement_json: unknown;
    fields_json: unknown;
    created_at: string;
    updated_at: string;
};

const toPlacement = (value: unknown): EditorTemplatePlacement => {
    if (
        value &&
        typeof value === "object" &&
        Array.isArray((value as { left?: unknown }).left) &&
        Array.isArray((value as { right?: unknown }).right)
    ) {
        return {
            left: (value as { left: unknown[] }).left.filter(
                (item): item is string => typeof item === "string",
            ),
            right: (value as { right: unknown[] }).right.filter(
                (item): item is string => typeof item === "string",
            ),
        };
    }

    return { left: [], right: [] };
};

const toFields = (value: unknown): EditorTemplateField[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }

            const definitionId = (entry as { definitionId?: unknown })
                .definitionId;
            const kind = (entry as { kind?: unknown }).kind;
            const orderIndex = (entry as { orderIndex?: unknown }).orderIndex;

            if (
                typeof definitionId !== "string" ||
                (kind !== "field" && kind !== "paragraph" && kind !== "select")
            ) {
                return null;
            }

            return {
                definitionId,
                kind,
                orderIndex:
                    typeof orderIndex === "number" && Number.isFinite(orderIndex)
                        ? Math.max(0, Math.floor(orderIndex))
                        : 0,
            } satisfies EditorTemplateField;
        })
        .filter((entry): entry is EditorTemplateField => entry !== null)
        .sort((a, b) => a.orderIndex - b.orderIndex);
};

const mapRowToTemplate = (row: EditorTemplateRow): EditorTemplate =>
    new EditorTemplate(
        row.id,
        row.project_id,
        row.editor_type,
        toPlacement(row.placement_json),
        toFields(row.fields_json),
        new Date(row.created_at),
        new Date(row.updated_at),
    );

export class SupabaseEditorTemplateRepository
    implements IEditorTemplateRepository
{
    async create(template: EditorTemplate): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("editor_templates").insert({
            id: template.id,
            project_id: template.projectId,
            editor_type: template.editorType,
            placement_json: template.placement,
            fields_json: template.fields,
            created_at: template.createdAt.toISOString(),
            updated_at: template.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<EditorTemplate | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("editor_templates")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return mapRowToTemplate(data as EditorTemplateRow);
    }

    async findByProjectId(projectId: string): Promise<EditorTemplate[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("editor_templates")
            .select("*")
            .eq("project_id", projectId)
            .order("editor_type", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as EditorTemplateRow[]).map(mapRowToTemplate);
    }

    async findByProjectAndEditorType(
        projectId: string,
        editorType: EditorTemplateType,
    ): Promise<EditorTemplate | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("editor_templates")
            .select("*")
            .eq("project_id", projectId)
            .eq("editor_type", editorType)
            .maybeSingle();

        if (error || !data) {
            return null;
        }

        return mapRowToTemplate(data as EditorTemplateRow);
    }

    async update(template: EditorTemplate): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("editor_templates")
            .update({
                editor_type: template.editorType,
                placement_json: template.placement,
                fields_json: template.fields,
                updated_at: template.updatedAt.toISOString(),
            })
            .eq("id", template.id);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("editor_templates")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message);
    }
}
