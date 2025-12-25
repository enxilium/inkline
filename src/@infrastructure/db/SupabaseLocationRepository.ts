import { Location } from "../../@core/domain/entities/story/world/Location";
import { ILocationRepository } from "../../@core/domain/repositories/ILocationRepository";
import { SupabaseService } from "./SupabaseService";

type LocationRow = {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    culture: string | null;
    history: string | null;
    conflicts: string[] | null;
    tags: string[] | null;
    bgm_id: string | null;
    playlist_id: string | null;
    gallery_image_ids: string[] | null;
    character_ids: string[] | null;
    organization_ids: string[] | null;
    created_at: string;
    updated_at: string;
};

const parseStringArray = (value: string[] | null | undefined): string[] =>
    Array.isArray(value)
        ? value.map((entry) => entry ?? "").filter(Boolean)
        : [];

const mapRowToLocation = (row: LocationRow): Location =>
    new Location(
        row.id,
        row.name,
        row.description ?? "",
        row.culture ?? "",
        row.history ?? "",
        parseStringArray(row.conflicts),
        parseStringArray(row.tags),
        new Date(row.created_at),
        new Date(row.updated_at),
        row.bgm_id,
        row.playlist_id,
        parseStringArray(row.gallery_image_ids),
        parseStringArray(row.character_ids),
        parseStringArray(row.organization_ids)
    );

export class SupabaseLocationRepository implements ILocationRepository {
    async create(projectId: string, location: Location): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("locations").insert({
            id: location.id,
            project_id: projectId,
            name: location.name,
            description: location.description,
            culture: location.culture,
            history: location.history,
            conflicts: location.conflicts,
            tags: location.tags,
            bgm_id: location.bgmId,
            playlist_id: location.playlistId,
            gallery_image_ids: location.galleryImageIds,
            character_ids: location.characterIds,
            organization_ids: location.organizationIds,
            created_at: location.createdAt.toISOString(),
            updated_at: location.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<Location | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("locations")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return null;

        return mapRowToLocation(data as LocationRow);
    }

    async findByProjectId(projectId: string): Promise<Location[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("locations")
            .select("*")
            .eq("project_id", projectId)
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as LocationRow[]).map(mapRowToLocation);
    }

    async update(location: Location): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("locations")
            .update({
                name: location.name,
                description: location.description,
                culture: location.culture,
                history: location.history,
                conflicts: location.conflicts,
                tags: location.tags,
                bgm_id: location.bgmId,
                playlist_id: location.playlistId,
                gallery_image_ids: location.galleryImageIds,
                character_ids: location.characterIds,
                organization_ids: location.organizationIds,
                updated_at: new Date().toISOString(),
            })
            .eq("id", location.id);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("locations").delete().eq("id", id);
        if (error) throw new Error(error.message);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("locations")
            .delete()
            .eq("project_id", projectId);
        if (error) throw new Error(error.message);
    }

    async getLocationProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("locations")
            .select("name, description")
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (
            data as Array<{ name: string | null; description: string | null }>
        ).map((row) => ({
            name: row.name ?? "",
            description: row.description ?? "",
        }));
    }
}
