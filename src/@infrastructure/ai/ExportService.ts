import * as fs from "fs";
import PDFDocument from "pdfkit";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
} from "docx";
import EPub from "epub-gen";

import { IExportService } from "../../@core/domain/services/IExportService";
import { IProjectRepository } from "../../@core/domain/repositories/IProjectRepository";
import { IChapterRepository } from "../../@core/domain/repositories/IChapterRepository";
import { Project } from "../../@core/domain/entities/story/Project";
import { Chapter } from "../../@core/domain/entities/story/Chapter";

export class ExportService implements IExportService {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository
    ) {}

    async exportProject(
        projectId: string,
        format: "pdf" | "epub" | "docx",
        destinationPath: string
    ): Promise<void> {
        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error(`Project with ID ${projectId} not found.`);
        }

        const allChapters =
            await this.chapterRepository.findByProjectId(projectId);
        const chapters = this.sortChapters(allChapters, project.chapterIds);

        switch (format) {
            case "pdf":
                await this.exportToPdf(project, chapters, destinationPath);
                break;
            case "docx":
                await this.exportToDocx(project, chapters, destinationPath);
                break;
            case "epub":
                await this.exportToEpub(project, chapters, destinationPath);
                break;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
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

    private async exportToPdf(
        project: Project,
        chapters: Chapter[],
        outputPath: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument();
            const stream = fs.createWriteStream(outputPath);

            doc.pipe(stream);

            // Title Page
            doc.fontSize(24).text(project.title, { align: "center" });
            doc.moveDown();

            for (const chapter of chapters) {
                doc.addPage();
                doc.fontSize(18).text(chapter.title, { align: "center" });
                doc.moveDown();

                const plainText = this.convertContentToText(chapter.content);
                doc.fontSize(12).text(plainText, {
                    align: "justify",
                    indent: 20,
                    lineGap: 5,
                });
            }

            doc.end();

            stream.on("finish", () => resolve());
            stream.on("error", reject);
        });
    }

    private async exportToDocx(
        project: Project,
        chapters: Chapter[],
        outputPath: string
    ): Promise<void> {
        const children = [];

        // Title
        children.push(
            new Paragraph({
                text: project.title,
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
            })
        );

        for (const chapter of chapters) {
            children.push(
                new Paragraph({
                    text: chapter.title,
                    heading: HeadingLevel.HEADING_1,
                    pageBreakBefore: true,
                    alignment: AlignmentType.CENTER,
                })
            );

            const plainText = this.convertContentToText(chapter.content);
            const paragraphs = plainText.split("\n");

            for (const para of paragraphs) {
                if (para.trim()) {
                    children.push(
                        new Paragraph({
                            children: [new TextRun(para.trim())],
                            alignment: AlignmentType.JUSTIFIED,
                            indent: { firstLine: 720 }, // 0.5 inch
                        })
                    );
                }
            }
        }

        const doc = new Document({
            sections: [
                {
                    properties: {},
                    children: children,
                },
            ],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(outputPath, buffer);
    }

    private async exportToEpub(
        project: Project,
        chapters: Chapter[],
        outputPath: string
    ): Promise<void> {
        const content = chapters.map((chapter) => {
            const text = this.convertContentToText(chapter.content);
            return {
                title: chapter.title,
                data: this.convertTextToHtml(text),
            };
        });

        const options = {
            title: project.title,
            author: "Unknown",
            output: outputPath,
            content: content,
        };

        await new EPub(options, outputPath).promise;
    }

    private convertContentToText(content: string): string {
        try {
            const json = JSON.parse(content);
            if (json.type === "doc" && Array.isArray(json.content)) {
                return this.extractTextFromTiptap(json).trim();
            }
        } catch (e) {
            // Not JSON, fall back to HTML/Text handling
        }

        return this.convertHtmlToText(content);
    }

    private extractTextFromTiptap(node: Record<string, unknown>): string {
        if (node.type === "text" && typeof node.text === "string") {
            return node.text || "";
        }

        if (node.type === "hardBreak") {
            return "\n";
        }

        let text = "";
        if (Array.isArray(node.content)) {
            text = node.content
                .map((child) =>
                    this.extractTextFromTiptap(child as Record<string, unknown>)
                )
                .join("");
        }

        if (node.type === "paragraph" || node.type === "heading") {
            return text + "\n\n";
        }

        return text;
    }

    private convertTextToHtml(text: string): string {
        return text
            .split("\n\n")
            .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
            .join("");
    }

    private convertHtmlToText(html: string): string {
        // Simple conversion for Tiptap HTML
        let text = html;
        text = text.replace(/<\/p>/gi, "\n\n");
        text = text.replace(/<br\s*\/?>/gi, "\n");
        text = text.replace(/<[^>]+>/g, ""); // Strip tags
        text = text.replace(/&nbsp;/g, " ");
        text = text.replace(/&lt;/g, "<");
        text = text.replace(/&gt;/g, ">");
        text = text.replace(/&amp;/g, "&");
        return text.trim();
    }
}
