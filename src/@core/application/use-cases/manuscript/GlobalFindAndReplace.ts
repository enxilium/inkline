import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";

export interface GlobalFindAndReplaceRequest {
    projectId: string;
    find: string;
    replace: string;
    caseSensitive?: boolean;
}

export interface GlobalFindAndReplaceResponse {
    replacements: number;
}

export class GlobalFindAndReplace {
    constructor(private readonly chapterRepository: IChapterRepository) {}

    async execute(
        request: GlobalFindAndReplaceRequest
    ): Promise<GlobalFindAndReplaceResponse> {
        const { projectId, find, replace, caseSensitive } = request;

        if (!projectId.trim()) {
            throw new Error("Project ID is required.");
        }

        if (!find) {
            throw new Error("Find term cannot be empty.");
        }

        const chapters =
            await this.chapterRepository.findByProjectId(projectId);
        const flags = caseSensitive ? "g" : "gi";
        const regex = new RegExp(this.escapeRegExp(find), flags);

        const chapterReplacements = await Promise.all(
            chapters.map(async (chapter) => {
                let matchCount = 0;
                let newContent = chapter.content;
                let hasChanges = false;

                try {
                    // Try parsing as Tiptap JSON
                    const contentJson = JSON.parse(chapter.content);
                    const result = this.replaceInJson(
                        contentJson,
                        regex,
                        replace
                    );
                    if (result.count > 0) {
                        matchCount = result.count;
                        newContent = JSON.stringify(contentJson);
                        hasChanges = true;
                    }
                } catch {
                    // Fallback for legacy plain text/HTML
                    const matches = chapter.content.match(regex);
                    if (matches && matches.length > 0) {
                        matchCount = matches.length;
                        newContent = chapter.content.replace(regex, replace);
                        hasChanges = true;
                    }
                }

                if (hasChanges) {
                    chapter.content = newContent;
                    chapter.updatedAt = new Date();
                    await this.chapterRepository.update(chapter);
                }
                return matchCount;
            })
        );

        const replacements = chapterReplacements.reduce(
            (sum, count) => sum + count,
            0
        );
        return { replacements };
    }

    private replaceInJson(
        node: any,
        regex: RegExp,
        replaceText: string
    ): { count: number } {
        let count = 0;
        if (node.type === "text" && typeof node.text === "string") {
            const matches = node.text.match(regex);
            if (matches && matches.length > 0) {
                count += matches.length;
                node.text = node.text.replace(regex, replaceText);
            }
        } else if (node.content && Array.isArray(node.content)) {
            for (const child of node.content) {
                count += this.replaceInJson(child, regex, replaceText).count;
            }
        }
        return { count };
    }

    private escapeRegExp(term: string): string {
        return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
