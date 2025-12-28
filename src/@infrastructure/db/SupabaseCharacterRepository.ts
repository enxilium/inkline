import { Character } from "../../@core/domain/entities/story/world/Character";
import { ICharacterRepository } from "../../@core/domain/repositories/ICharacterRepository";
import { SupabaseService } from "./SupabaseService";

type CharacterRow = {
    id: string;
    project_id: string;
    name: string;
    race: string | null;
    age: number | null;
    description: string | null;
    current_location_id: string | null;
    background_location_id: string | null;
    organization_id: string | null;
    traits: string[] | null;
    goals: string[] | null;
    secrets: string[] | null;
    powers: { title: string; description: string }[] | null;
    tags: string[] | null;
    bgm_id: string | null;
    playlist_id: string | null;
    gallery_image_ids: string[] | null;
    created_at: string;
    updated_at: string;
};

const parseStringArray = (value: string[] | null | undefined): string[] =>
    Array.isArray(value)
        ? value.map((entry) => entry ?? "").filter(Boolean)
        : [];

const parsePowers = (value: any): { title: string; description: string }[] => {
    if (!Array.isArray(value)) return [];
    return value.map((entry: any) => ({
        title: typeof entry?.title === "string" ? entry.title : "",
        description:
            typeof entry?.description === "string" ? entry.description : "",
    }));
};

const mapRowToCharacter = (row: CharacterRow): Character =>
    new Character(
        row.id,
        row.name,
        row.race ?? "",
        row.age,
        row.description ?? "",
        row.current_location_id,
        row.background_location_id,
        row.organization_id,
        parseStringArray(row.traits),
        parseStringArray(row.goals),
        parseStringArray(row.secrets),
        parsePowers(row.powers),
        parseStringArray(row.tags),
        row.bgm_id,
        row.playlist_id,
        parseStringArray(row.gallery_image_ids),
        new Date(row.created_at),
        new Date(row.updated_at)
    );

export class SupabaseCharacterRepository implements ICharacterRepository {
    async create(projectId: string, character: Character): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("characters").insert({
            id: character.id,
            project_id: projectId,
            name: character.name,
            race: character.race,
            age: character.age,
            description: character.description,
            current_location_id: character.currentLocationId,
            background_location_id: character.backgroundLocationId,
            organization_id: character.organizationId,
            traits: character.traits,
            goals: character.goals,
            secrets: character.secrets,
            powers: character.powers,
            tags: character.tags,
            bgm_id: character.bgmId,
            playlist_id: character.playlistId,
            gallery_image_ids: character.galleryImageIds,
            created_at: character.createdAt.toISOString(),
            updated_at: character.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<Character | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("characters")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return null;

        return mapRowToCharacter(data as CharacterRow);
    }

    async findByProjectId(projectId: string): Promise<Character[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("characters")
            .select("*")
            .eq("project_id", projectId)
            .order("created_at", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as CharacterRow[]).map(mapRowToCharacter);
    }

    async update(character: Character): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("characters")
            .update({
                name: character.name,
                race: character.race,
                age: character.age,
                description: character.description,
                current_location_id: character.currentLocationId,
                background_location_id: character.backgroundLocationId,
                organization_id: character.organizationId,
                traits: character.traits,
                goals: character.goals,
                secrets: character.secrets,
                powers: character.powers,
                tags: character.tags,
                bgm_id: character.bgmId,
                playlist_id: character.playlistId,
                gallery_image_ids: character.galleryImageIds,
                updated_at: character.updatedAt.toISOString(),
            })
            .eq("id", character.id);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("characters").delete().eq("id", id);
        if (error) throw new Error(error.message);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("characters")
            .delete()
            .eq("project_id", projectId);
        if (error) throw new Error(error.message);
    }

    async getCharacterProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("characters")
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
