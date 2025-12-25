import { IChapterRepository } from "../../@core/domain/repositories/IChapterRepository";
import { Chapter } from "../../@core/domain/entities/story/Chapter";
import { SupabaseService } from "./SupabaseService";

type ChapterRow = {
    id: string;
    project_id: string;
    title: string;
    order_index: number;
    content: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
};

const defaultContent: Record<string, unknown> = {
    type: "doc",
    content: [] as unknown[],
};

const parseChapterContent = (raw: string): Record<string, unknown> => {
    if (!raw || !raw.trim()) {
        return defaultContent;
    }
    try {
        const parsed = JSON.parse(raw);
        return typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : defaultContent;
    } catch (error) {
        console.warn("Invalid chapter content JSON. Using default doc.", error);
        return defaultContent;
    }
};

const serializeChapterContent = (
    content: Record<string, unknown> | null
): string => {
    try {
        return JSON.stringify(content ?? defaultContent);
    } catch (error) {
        console.warn("Failed to stringify chapter content.", error);
        return JSON.stringify(defaultContent);
    }
};

const mapRowToChapter = (row: ChapterRow): Chapter =>
    new Chapter(
        row.id,
        row.title,
        row.order_index,
        serializeChapterContent(row.content),
        new Date(row.created_at),
        new Date(row.updated_at)
    );

export class SupabaseChapterRepository implements IChapterRepository {
    async create(projectId: string, chapter: Chapter): Promise<void> {
        const client = SupabaseService.getClient();

        const { error } = await client.from("chapters").insert({
            id: chapter.id,
            project_id: projectId,
            title: chapter.title,
            order_index: chapter.order,
            content: parseChapterContent(chapter.content),
            created_at: chapter.createdAt.toISOString(),
            updated_at: chapter.updatedAt.toISOString(),
        });

        if (error) throw new Error(error.message);
    }

    async findById(id: string): Promise<Chapter | null> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("chapters")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !data) return null;

        return mapRowToChapter(data as ChapterRow);
    }

    async findByProjectId(projectId: string): Promise<Chapter[]> {
        const client = SupabaseService.getClient();
        const { data, error } = await client
            .from("chapters")
            .select("*")
            .eq("project_id", projectId)
            .order("order_index", { ascending: true });

        if (error) throw new Error(error.message);
        if (!data) return [];

        return (data as ChapterRow[]).map(mapRowToChapter);
    }

    async update(chapter: Chapter): Promise<void> {
        const client = SupabaseService.getClient();

        const { error } = await client
            .from("chapters")
            .update({
                title: chapter.title,
                content: parseChapterContent(chapter.content),
                order_index: chapter.order,
                updated_at: new Date().toISOString(),
            })
            .eq("id", chapter.id);

        if (error) throw new Error(error.message);
    }

    async updateContent(chapterId: string, content: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("chapters")
            .update({
                content: parseChapterContent(content),
                updated_at: new Date().toISOString(),
            })
            .eq("id", chapterId);

        if (error) throw new Error(error.message);
    }

    async delete(id: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client.from("chapters").delete().eq("id", id);
        if (error) throw new Error(error.message);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const client = SupabaseService.getClient();
        const { error } = await client
            .from("chapters")
            .delete()
            .eq("project_id", projectId);
        if (error) throw new Error(error.message);
    }
}
