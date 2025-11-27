import { Organization } from "../../@core/domain/entities/story/world/Organization";
import { IOrganizationRepository } from "../../@core/domain/repositories/IOrganizationRepository";
import { SupabaseService } from "./SupabaseService";

type OrganizationRow = {
    id: string;
    project_id: string;
    name: string;
    description: string | null;
    mission: string | null;
    tags: string[] | null;
    location_ids: string[] | null;
    gallery_image_ids: string[] | null;
    playlist_id: string | null;
    bgm_id: string | null;
    created_at: string;
    updated_at: string;
};

const parseStringArray = (value: string[] | null | undefined): string[] =>
    Array.isArray(value)
        ? value.map((entry) => entry ?? "").filter(Boolean)
        : [];

const mapRowToOrganization = (row: OrganizationRow): Organization =>
    new Organization(
        row.id,
        row.name,
        row.description ?? "",
        row.mission ?? "",
        parseStringArray(row.tags),
        parseStringArray(row.location_ids),
        parseStringArray(row.gallery_image_ids),
        row.playlist_id,
        row.bgm_id,
        new Date(row.created_at),
        new Date(row.updated_at)
    );

export class SupabaseOrganizationRepository implements IOrganizationRepository {
    async create(projectId: string, organization: Organization): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("organizations").insert({
            id: organization.id,
            project_id: projectId,
            name: organization.name,
            description: organization.description,
            mission: organization.mission,
            tags: organization.tags,
            location_ids: organization.locationIds,
            gallery_image_ids: organization.galleryImageIds,
            playlist_id: organization.playlistId,
            bgm_id: organization.bgmId,
            created_at: organization.createdAt.toISOString(),
            updated_at: organization.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(
        projectId: string,
        id: string
    ): Promise<Organization | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("organizations")
            .select("*")
            .eq("id", id)
            .eq("project_id", projectId)
            .single();

        if (error || !data) return null;

        return mapRowToOrganization(data as OrganizationRow);
    }

    async findByProjectId(projectId: string): Promise<Organization[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("organizations")
            .select("*")
            .eq("project_id", projectId)
            .order("name", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as OrganizationRow[]).map(mapRowToOrganization);
    }

    async findByLocationId(
        projectId: string,
        locationId: string
    ): Promise<Organization[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("organizations")
            .select("*")
            .eq("project_id", projectId)
            .contains("location_ids", [locationId])
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as OrganizationRow[]).map(mapRowToOrganization);
    }

    async update(projectId: string, organization: Organization): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("organizations")
            .update({
                name: organization.name,
                description: organization.description,
                mission: organization.mission,
                tags: organization.tags,
                location_ids: organization.locationIds,
                gallery_image_ids: organization.galleryImageIds,
                playlist_id: organization.playlistId,
                bgm_id: organization.bgmId,
                updated_at: organization.updatedAt.toISOString(),
            })
            .eq("id", organization.id)
            .eq("project_id", projectId);

        if (error) throw new Error(error.message);
    }

    async delete(projectId: string, id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("organizations")
            .delete()
            .eq("id", id)
            .eq("project_id", projectId);
        if (error) throw new Error(error.message);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("organizations")
            .delete()
            .eq("project_id", projectId);
        if (error) throw new Error(error.message);
    }

    async getOrganizationProfiles(
        projectId: string
    ): Promise<{ name: string; description: string; mission?: string }[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("organizations")
            .select("name, description, mission")
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (
            data as Array<{
                name: string | null;
                description: string | null;
                mission: string | null;
            }>
        ).map((row) => ({
            name: row.name ?? "",
            description: row.description ?? "",
            mission: row.mission ?? undefined,
        }));
    }
}
