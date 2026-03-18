import { Character } from "../../@core/domain/entities/story/world/Character";
import { ICharacterRepository } from "../../@core/domain/repositories/ICharacterRepository";
import { SupabaseService } from "./SupabaseService";
import {
    CharacterDbInsert,
    CharacterDbRow,
    CharacterDbUpdate,
} from "./contracts/schema";
import { asStringArray } from "./contracts/json";

const mapRowToCharacter = (row: CharacterDbRow): Character =>
    new Character(
        row.id,
        row.name,
        row.description ?? "",
        row.current_location_id,
        row.background_location_id,
        row.organization_id,
        row.bgm_id,
        row.playlist_id,
        asStringArray(row.gallery_image_ids),
        new Date(row.created_at),
        new Date(row.updated_at),
    );

export class SupabaseCharacterRepository implements ICharacterRepository {
    async create(projectId: string, character: Character): Promise<void> {
        const client = SupabaseService.getClient();
        const insertPayload = {
            id: character.id,
            project_id: projectId,
            name: character.name,
            description: character.description,
            current_location_id: character.currentLocationId,
            background_location_id: character.backgroundLocationId,
            organization_id: character.organizationId,
            bgm_id: character.bgmId,
            playlist_id: character.playlistId,
            gallery_image_ids: character.galleryImageIds,
            created_at: character.createdAt.toISOString(),
            updated_at: character.updatedAt.toISOString(),
        } satisfies CharacterDbInsert;

        const { error } = await client.from("characters").insert(insertPayload);

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

        return mapRowToCharacter(data as CharacterDbRow);
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

        return (data as CharacterDbRow[]).map(mapRowToCharacter);
    }

    async update(character: Character): Promise<void> {
        const client = SupabaseService.getClient();
        const updatePayload = {
            name: character.name,
            description: character.description,
            current_location_id: character.currentLocationId,
            background_location_id: character.backgroundLocationId,
            organization_id: character.organizationId,
            bgm_id: character.bgmId,
            playlist_id: character.playlistId,
            gallery_image_ids: character.galleryImageIds,
            updated_at: character.updatedAt.toISOString(),
        } satisfies CharacterDbUpdate;

        const { error } = await client
            .from("characters")
            .update(updatePayload)
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
        projectId: string,
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
