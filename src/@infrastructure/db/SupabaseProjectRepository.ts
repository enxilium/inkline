import { IProjectRepository } from "../../@core/domain/repositories/IProjectRepository";
import { Project } from "../../@core/domain/entities/story/Project";
import { SupabaseService } from "./SupabaseService";

type ProjectRow = {
    id: string;
    title: string;
    cover_image_id: string | null;
    user_id: string;
    created_at: string;
    updated_at: string;
};

type ProjectRelations = {
    chapterIds: string[];
    characterIds: string[];
    locationIds: string[];
    scrapNoteIds: string[];
    organizationIds: string[];
    timelineIds: string[];
};

const mapProjectRowToEntity = (
    row: ProjectRow,
    relations?: ProjectRelations
): Project =>
    new Project(
        row.id,
        row.title,
        row.cover_image_id,
        [...(relations?.chapterIds ?? [])],
        [...(relations?.characterIds ?? [])],
        [...(relations?.locationIds ?? [])],
        [...(relations?.scrapNoteIds ?? [])],
        [...(relations?.organizationIds ?? [])],
        [...(relations?.timelineIds ?? [])],
        new Date(row.created_at),
        new Date(row.updated_at)
    );

export class SupabaseProjectRepository implements IProjectRepository {
    async create(ownerId: string, project: Project): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("projects").insert({
            id: project.id,
            user_id: ownerId,
            title: project.title,
            cover_image_id: project.coverImageId,
            created_at: project.createdAt.toISOString(),
            updated_at: project.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<Project | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("projects")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return null;

        const relations = await this.loadProjectRelations(id);
        return mapProjectRowToEntity(data as ProjectRow, relations);
    }

    async findAllByUserId(userId: string): Promise<Project[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("projects")
            .select("*")
            .eq("user_id", userId);

        if (error) throw new Error(error.message);

        if (!data) {
            return [];
        }

        return (data as ProjectRow[]).map((row) => mapProjectRowToEntity(row));
    }

    async update(project: Project): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("projects")
            .update({
                title: project.title,
                cover_image_id: project.coverImageId,
                updated_at: project.updatedAt.toISOString(),
            })
            .eq("id", project.id);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("projects").delete().eq("id", id);
        if (error) throw new Error(error.message);
    }

    private async loadProjectRelations(
        projectId: string
    ): Promise<ProjectRelations> {
        const client = SupabaseService.getClient();

        const fetchIds = async (table: string): Promise<string[]> => {
            const { data, error } = await client
                .from(table)
                .select("id")
                .eq("project_id", projectId);

            if (error) {
                throw new Error(error.message);
            }

            return ((data as Array<{ id: string }> | null) ?? []).map(
                (row) => row.id
            );
        };

        const [
            chapterIds,
            characterIds,
            locationIds,
            scrapNoteIds,
            organizationIds,
            timelineIds,
        ] = await Promise.all([
            fetchIds("chapters"),
            fetchIds("characters"),
            fetchIds("locations"),
            fetchIds("scrap_notes"),
            fetchIds("organizations"),
            fetchIds("timelines"),
        ]);

        return {
            chapterIds,
            characterIds,
            locationIds,
            scrapNoteIds,
            organizationIds,
            timelineIds,
        };
    }
}
