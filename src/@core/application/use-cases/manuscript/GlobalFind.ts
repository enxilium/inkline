import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";

export interface GlobalFindRequest {
    projectId: string;
    term: string;
    caseSensitive?: boolean;
}

export interface GlobalFindResult {
    chapterId: string;
    chapterTitle: string;
    occurrences: number;
    positions: number[];
}

export interface GlobalFindResponse {
    totalOccurrences: number;
    results: GlobalFindResult[];
}

export class GlobalFind {
    constructor(private readonly chapterRepository: IChapterRepository) {}

    async execute(request: GlobalFindRequest): Promise<GlobalFindResponse> {
        const { projectId, term } = request;

        if (!projectId.trim()) {
            throw new Error("Project ID is required.");
        }

        if (!term.trim()) {
            throw new Error("Search term cannot be empty.");
        }

        const chapters =
            await this.chapterRepository.findByProjectId(projectId);
        const results: GlobalFindResult[] = [];
        let totalOccurrences = 0;

        chapters.forEach((chapter) => {
            let count = 0;
            try {
                // Try parsing as Tiptap JSON
                const contentJson = JSON.parse(chapter.content);
                count = this.countInJson(
                    contentJson,
                    term,
                    request.caseSensitive ?? false
                );
            } catch {
                // Fallback for legacy plain text/HTML
                const positions = this.findOccurrences(
                    chapter.content,
                    term,
                    request.caseSensitive ?? false
                );
                count = positions.length;
            }

            if (count > 0) {
                totalOccurrences += count;
                results.push({
                    chapterId: chapter.id,
                    chapterTitle: chapter.title,
                    occurrences: count,
                    positions: [], // Positions are not stable in JSON structure
                });
            }
        });

        return { totalOccurrences, results };
    }

    private countInJson(
        node: any,
        term: string,
        caseSensitive: boolean
    ): number {
        let count = 0;
        if (node.type === "text" && typeof node.text === "string") {
            count += this.findOccurrences(
                node.text,
                term,
                caseSensitive
            ).length;
        } else if (node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
                count += this.countInJson(child, term, caseSensitive);
            }
        }
        return count;
    }

    private findOccurrences(
        source: string,
        term: string,
        caseSensitive: boolean
    ): number[] {
        const haystack = caseSensitive ? source : source.toLowerCase();
        const needle = caseSensitive ? term : term.toLowerCase();
        const positions: number[] = [];

        if (!needle) {
            return positions;
        }

        let index = haystack.indexOf(needle);
        while (index !== -1) {
            positions.push(index);
            index = haystack.indexOf(needle, index + needle.length);
        }

        return positions;
    }
}
