import { ScrapNote } from "../../@core/domain/entities/story/ScrapNote";
import { IScrapNoteRepository } from "../../@core/domain/repositories/IScrapNoteRepository";
import { SupabaseService } from "./SupabaseService";

type ScrapNoteRow = {
    id: string;
    project_id: string;
    title: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
};

const mapRowToScrapNote = (row: ScrapNoteRow): ScrapNote =>
    new ScrapNote(
        row.id,
        row.title,
        row.content,
        row.is_pinned,
        new Date(row.created_at),
        new Date(row.updated_at)
    );

export class SupabaseScrapNoteRepository implements IScrapNoteRepository {
    async create(projectId: string, scrapNote: ScrapNote): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("scrap_notes").insert({
            id: scrapNote.id,
            project_id: projectId,
            title: scrapNote.title,
            content: scrapNote.content,
            is_pinned: scrapNote.isPinned,
            created_at: scrapNote.createdAt.toISOString(),
            updated_at: scrapNote.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<ScrapNote | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("scrap_notes")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return null;

        return mapRowToScrapNote(data as ScrapNoteRow);
    }

    async findByProjectId(projectId: string): Promise<ScrapNote[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("scrap_notes")
            .select("*")
            .eq("project_id", projectId)
            .order("updated_at", { ascending: false });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as ScrapNoteRow[]).map(mapRowToScrapNote);
    }

    async update(scrapNote: ScrapNote): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("scrap_notes")
            .update({
                title: scrapNote.title,
                content: scrapNote.content,
                is_pinned: scrapNote.isPinned,
                updated_at: scrapNote.updatedAt.toISOString(),
            })
            .eq("id", scrapNote.id);

        if (error) throw new Error(error.message);
    }

    async updateContent(
        scrapNoteId: string,
        content: string,
        updatedAt?: Date
    ): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("scrap_notes")
            .update({
                content: content,
                updated_at: (updatedAt || new Date()).toISOString(),
            })
            .eq("id", scrapNoteId);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("scrap_notes")
            .delete()
            .eq("id", id);
        if (error) throw new Error(error.message);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("scrap_notes")
            .delete()
            .eq("project_id", projectId);
        if (error) throw new Error(error.message);
    }
}
