import epub from "epub-gen-memory";
import * as fsPromises from "fs/promises";

import { IExportService } from "../../@core/domain/services/IExportService";
import { IProjectRepository } from "../../@core/domain/repositories/IProjectRepository";
import { IChapterRepository } from "../../@core/domain/repositories/IChapterRepository";
import { IScrapNoteRepository } from "../../@core/domain/repositories/IScrapNoteRepository";
import { Chapter } from "../../@core/domain/entities/story/Chapter";

// ─── Tiptap JSON types ───────────────────────────────────────────────────────

interface TiptapMark {
    type: string;
    attrs?: Record<string, unknown>;
}

interface TiptapNode {
    type: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: TiptapMark[];
    content?: TiptapNode[];
}

// ─── Tiptap JSON → HTML converter ───────────────────────────────────────────

/**
 * Recursively converts a Tiptap JSON document tree into semantic HTML
 * suitable for EPUB readers.
 *
 * Supported nodes: doc, paragraph, heading (1-3), bulletList, orderedList,
 * listItem, blockquote, codeBlock, hardBreak, horizontalRule.
 *
 * Supported marks: bold, italic, underline, strike, code, link,
 * textStyle (color, fontFamily).
 */
function renderMarks(text: string, marks: TiptapMark[] | undefined): string {
    if (!marks || marks.length === 0) {
        return escapeHtml(text);
    }

    let html = escapeHtml(text);

    for (const mark of marks) {
        switch (mark.type) {
            case "bold":
                html = `<strong>${html}</strong>`;
                break;
            case "italic":
                html = `<em>${html}</em>`;
                break;
            case "underline":
                html = `<u>${html}</u>`;
                break;
            case "strike":
                html = `<s>${html}</s>`;
                break;
            case "code":
                html = `<code>${html}</code>`;
                break;
            case "link": {
                const href = (mark.attrs?.href as string) || "#";
                html = `<a href="${escapeAttr(href)}">${html}</a>`;
                break;
            }
            case "textStyle": {
                const styles: string[] = [];
                if (mark.attrs?.color) {
                    styles.push(`color: ${mark.attrs.color}`);
                }
                if (mark.attrs?.fontFamily) {
                    styles.push(`font-family: ${mark.attrs.fontFamily}`);
                }
                if (styles.length > 0) {
                    html = `<span style="${escapeAttr(styles.join("; "))}">${html}</span>`;
                }
                break;
            }
            // Silently skip unknown marks (e.g. comment marks)
        }
    }

    return html;
}

interface RenderContext {
    listStart?: number;
    isFirstListItem?: boolean;
}

function renderNode(node: TiptapNode, context?: RenderContext): string {
    switch (node.type) {
        case "doc":
            return renderChildren(node, context);

        case "paragraph": {
            const styles: string[] = [];
            const align = node.attrs?.textAlign as string | undefined;
            if (align && align !== "left")
                styles.push(`text-align: ${escapeAttr(align)}`);
            if (node.attrs?.marginLeft)
                styles.push(`margin-left: ${node.attrs.marginLeft}px`);
            if (node.attrs?.textIndent)
                styles.push(`text-indent: ${node.attrs.textIndent}px`);
            if (node.attrs?.marginRight)
                styles.push(`margin-right: ${node.attrs.marginRight}px`);

            const styleString =
                styles.length > 0 ? ` style="${styles.join("; ")}"` : "";
            return `<p${styleString}>${renderChildren(node, context) || "&nbsp;"}</p>\n`;
        }

        case "heading": {
            const level = Math.min(
                Math.max(Number(node.attrs?.level) || 1, 1),
                6,
            );
            const styles: string[] = [];
            const align = node.attrs?.textAlign as string | undefined;
            if (align && align !== "left")
                styles.push(`text-align: ${escapeAttr(align)}`);
            if (node.attrs?.marginLeft)
                styles.push(`margin-left: ${node.attrs.marginLeft}px`);
            if (node.attrs?.textIndent)
                styles.push(`text-indent: ${node.attrs.textIndent}px`);
            if (node.attrs?.marginRight)
                styles.push(`margin-right: ${node.attrs.marginRight}px`);

            const styleString =
                styles.length > 0 ? ` style="${styles.join("; ")}"` : "";
            return `<h${level}${styleString}>${renderChildren(node, context)}</h${level}>\n`;
        }

        case "bulletList":
            return `<ul>\n${renderChildren(node, context)}</ul>\n`;

        case "orderedList": {
            const start = node.attrs?.start as number | undefined;
            const attr = start && start !== 1 ? ` start="${start}"` : "";
            return `<ol${attr}>\n${renderChildren(node, { ...context, listStart: start || 1 })}</ol>\n`;
        }

        case "listItem": {
            const valAttr =
                context?.listStart && context.isFirstListItem
                    ? ` value="${context.listStart}"`
                    : "";
            return `<li${valAttr}>${renderChildren(node, context)}</li>\n`;
        }

        case "blockquote":
            return `<blockquote>\n${renderChildren(node, context)}</blockquote>\n`;

        case "codeBlock": {
            const language = node.attrs?.language as string | undefined;
            const cls = language
                ? ` class="language-${escapeAttr(language)}"`
                : "";
            return `<pre><code${cls}>${renderChildren(node, context)}</code></pre>\n`;
        }

        case "hardBreak":
            return "<br/>";

        case "horizontalRule":
            return "<hr/>\n";

        case "image": {
            const src = (node.attrs?.src as string) || "";
            const alt = (node.attrs?.alt as string) || "";
            const title = (node.attrs?.title as string) || "";
            const titleAttr = title ? ` title="${escapeAttr(title)}"` : "";
            return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"${titleAttr}/>`;
        }

        case "documentReference":
            return escapeHtml(
                String(node.attrs?.label ?? node.attrs?.id ?? ""),
            );

        case "text":
            return renderMarks(node.text || "", node.marks);

        default:
            // Unknown node type – render children if any to avoid data loss
            return renderChildren(node, context);
    }
}

function renderChildren(node: TiptapNode, context?: RenderContext): string {
    if (!node.content || node.content.length === 0) {
        return "";
    }
    let listItemCount = 0;
    return node.content
        .map((child) => {
            let childContext = context;
            if (context?.listStart !== undefined && child.type === "listItem") {
                listItemCount++;
                childContext = {
                    ...context,
                    isFirstListItem: listItemCount === 1,
                };
            }
            return renderNode(child, childContext);
        })
        .join("");
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// ─── EPUB-specific CSS for a clean reading experience ────────────────────────

const EPUB_CSS = `
body {
    font-family: Georgia, "Times New Roman", serif;
    line-height: 1.6;
    margin: 1em;
    color: #1a1a1a;
}
h1, h2, h3 {
    font-family: Georgia, "Times New Roman", serif;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
}
h1 { font-size: 1.6em; text-align: center; }
h2 { font-size: 1.3em; }
h3 { font-size: 1.15em; }
p {
    text-indent: 1.5em;
    margin: 0 0 0.3em 0;
}
blockquote {
    margin: 1em 2em;
    padding-left: 1em;
    border-left: 3px solid #999;
    font-style: italic;
}
pre {
    background: #f4f4f4;
    padding: 0.8em;
    overflow-x: auto;
    font-size: 0.9em;
}
code {
    font-family: "Courier New", Courier, monospace;
    font-size: 0.9em;
}
ul, ol {
    margin: 0.5em 0;
    padding-left: 2em;
}
li {
    margin-bottom: 0.2em;
}
hr {
    border: none;
    border-top: 1px solid #ccc;
    margin: 1.5em 0;
}
a {
    color: #2a6496;
    text-decoration: underline;
}
`.trim();

// ─── ExportService ───────────────────────────────────────────────────────────

export class ExportService implements IExportService {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly scrapNoteRepository: IScrapNoteRepository,
    ) {}

    async exportDocument(
        projectId: string,
        documentId: string,
        documentType: "chapter" | "scrapNote",
        _format: "epub",
        destinationPath: string,
        author?: string,
    ): Promise<void> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error(`Project with ID ${projectId} not found.`);
        }

        let title = "Document";
        let content: any = null;

        if (documentType === "chapter") {
            const chapter = await this.chapterRepository.findById(documentId);
            if (!chapter || chapter.id !== documentId) {
                throw new Error(
                    `Chapter ${documentId} not found in project ${projectId}`,
                );
            }
            title = chapter.title;
            content = chapter.content;
        } else {
            const note = await this.scrapNoteRepository.findById(documentId);
            if (!note || note.id !== documentId) {
                throw new Error(
                    `ScrapNote ${documentId} not found in project ${projectId}`,
                );
            }
            title = note.title;
            content = note.content;
        }

        const htmlContent = this.convertContentToHtml(content);
        const stripped = htmlContent.replace(/<[^>]*>/g, "").trim();
        if (stripped.length === 0) {
            throw new Error("No content to export. Write some content first.");
        }

        await this.exportToEpub(
            title,
            [{ title, content: htmlContent } as any],
            destinationPath,
            author || "Unknown",
        );
    }

    async exportProject(
        projectId: string,
        _format: "epub",
        destinationPath: string,
        author?: string,
    ): Promise<void> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error(`Project with ID ${projectId} not found.`);
        }

        const allChapters =
            await this.chapterRepository.findByProjectId(projectId);
        const chapters = this.sortChapters(allChapters, project.chapterIds);

        await this.exportToEpub(
            project.title,
            chapters,
            destinationPath,
            author || "Unknown",
        );
    }

    private sortChapters(chapters: Chapter[], orderIds: string[]): Chapter[] {
        const chapterMap = new Map(chapters.map((c) => [c.id, c]));
        const sorted: Chapter[] = [];
        for (const id of orderIds) {
            const chapter = chapterMap.get(id);
            if (chapter) {
                sorted.push(chapter);
            }
        }
        return sorted;
    }

    private async exportToEpub(
        title: string,
        chapters: Chapter[],
        outputPath: string,
        author: string,
    ): Promise<void> {
        const content = chapters
            .filter((chapter) => {
                // Skip chapters with no meaningful content
                const html = this.convertContentToHtml(chapter.content);
                const stripped = html.replace(/<[^>]*>/g, "").trim();
                return stripped.length > 0;
            })
            .map((chapter) => ({
                title: chapter.title,
                content: this.convertContentToHtml(chapter.content),
            }));

        if (content.length === 0) {
            throw new Error(
                "No chapters with content to export. Write some content first.",
            );
        }

        const epubBuffer = await epub(
            {
                title,
                author,
                css: EPUB_CSS,
                prependChapterTitles: true,
                verbose: false,
            },
            content,
        );

        await fsPromises.writeFile(outputPath, epubBuffer);
    }

    /**
     * Converts chapter content (stored as Tiptap JSON or fallback HTML/text)
     * into semantic HTML suitable for EPUB.
     */
    private convertContentToHtml(content: string): string {
        if (!content || !content.trim()) {
            return "";
        }

        try {
            const json = JSON.parse(content) as TiptapNode;
            if (json.type === "doc" && Array.isArray(json.content)) {
                return renderNode(json);
            }
        } catch {
            // Not JSON – treat as raw HTML/text
        }

        // Fallback: if it looks like HTML, return as-is; otherwise wrap in <p>
        if (content.includes("<")) {
            return content;
        }

        return content
            .split("\n\n")
            .filter((p) => p.trim())
            .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
            .join("\n");
    }
}
