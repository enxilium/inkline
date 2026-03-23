import JSZip from "jszip";
import * as cheerio from "cheerio";
import type { Element as DomElement, Text as DomText } from "domhandler";
import * as path from "path";

import type {
    IEpubImportService,
    ParsedEpub,
    ParsedChapter,
    ParsedImage,
} from "../../@core/domain/services/IEpubImportService";
import { generateId } from "../../@core/application/utils/id";

// ─── Tiptap JSON types (mirrors ExportService) ──────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve a relative href against a base path inside the ZIP. */
function resolveZipPath(base: string, relative: string): string {
    const dir = base.substring(0, base.lastIndexOf("/") + 1);
    // Use path.posix to normalize ZIP paths (always forward-slash)
    return path.posix.normalize(dir + relative);
}

/** Map common image file extensions to MIME types. */
function guessMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const map: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
    };
    return map[ext] ?? "application/octet-stream";
}

/**
 * Normalize HTML text nodes so XHTML formatting whitespace does not turn into
 * visible editor content. Keeps semantic spacing between inline words.
 */
function normalizeHtmlTextNode(rawText: string): string | null {
    if (!rawText) return null;

    // Preserve meaningful text while collapsing HTML-collapsible whitespace.
    if (/[^\t\n\r\f ]/.test(rawText)) {
        const normalized = rawText.replace(/[\t\n\r\f ]+/g, " ");
        return normalized.length > 0 ? normalized : null;
    }

    // Ignore indentation/newline-only formatting nodes from pretty-printed XHTML.
    if (/[\t\n\r\f]/.test(rawText)) {
        return null;
    }

    // Preserve pure-space separators between adjacent inline nodes.
    return " ";
}

// ─── HTML → Tiptap JSON converter ───────────────────────────────────────────

type CheerioElement = DomElement;
type CheerioAPI = cheerio.CheerioAPI;

/**
 * Convert Cheerio child nodes into an array of Tiptap JSON nodes.
 * This is the inverse of ExportService.renderNode().
 */
function convertChildren(
    $: CheerioAPI,
    parent: cheerio.Cheerio<CheerioElement>,
    images: ParsedImage[],
    zip: JSZip,
    xhtmlPath: string,
    pendingImageLoads: Promise<void>[],
): TiptapNode[] {
    const nodes: TiptapNode[] = [];

    parent.contents().each((_i, el) => {
        if (el.type === "text") {
            const rawText = (el as DomText).data;
            const text = normalizeHtmlTextNode(rawText);
            if (text) {
                nodes.push({ type: "text", text });
            }
            return;
        }

        if (el.type !== "tag") return;

        const $el = $(el);
        const tag = (el as DomElement).tagName?.toLowerCase();

        switch (tag) {
            case "p": {
                const align = $el.css("text-align") || $el.attr("align");
                const attrs: Record<string, unknown> = {};
                if (align && align !== "left") {
                    attrs.textAlign = align;
                }
                const content = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                nodes.push({
                    type: "paragraph",
                    ...(Object.keys(attrs).length ? { attrs } : {}),
                    ...(content.length ? { content } : {}),
                });
                break;
            }

            case "h1":
            case "h2":
            case "h3":
            case "h4":
            case "h5":
            case "h6": {
                const level = parseInt(tag[1], 10);
                const align = $el.css("text-align") || $el.attr("align");
                const attrs: Record<string, unknown> = {
                    level: Math.min(level, 3),
                };
                if (align && align !== "left") {
                    attrs.textAlign = align;
                }
                const content = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                nodes.push({
                    type: "heading",
                    attrs,
                    ...(content.length ? { content } : {}),
                });
                break;
            }

            case "ul": {
                const content = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                if (content.length) {
                    nodes.push({ type: "bulletList", content });
                }
                break;
            }

            case "ol": {
                const start = parseInt($el.attr("start") ?? "1", 10);
                const attrs: Record<string, unknown> = {};
                if (start && start !== 1) attrs.start = start;
                const content = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                if (content.length) {
                    nodes.push({
                        type: "orderedList",
                        ...(Object.keys(attrs).length ? { attrs } : {}),
                        content,
                    });
                }
                break;
            }

            case "li": {
                // Tiptap listItems must wrap content in a paragraph
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                const wrapped = wrapInlineInParagraph(children);
                nodes.push({ type: "listItem", content: wrapped });
                break;
            }

            case "blockquote": {
                const content = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                const wrapped = wrapInlineInParagraph(content);
                nodes.push({ type: "blockquote", content: wrapped });
                break;
            }

            case "pre": {
                const codeEl = $el.find("code").first();
                const text = codeEl.length ? codeEl.text() : $el.text();
                const langClass = codeEl.attr("class") || "";
                const langMatch = langClass.match(/language-(\S+)/);
                const language = langMatch ? langMatch[1] : null;
                nodes.push({
                    type: "codeBlock",
                    ...(language ? { attrs: { language } } : {}),
                    content: text ? [{ type: "text", text }] : [],
                });
                break;
            }

            case "br":
                nodes.push({ type: "hardBreak" });
                break;

            case "hr":
                nodes.push({ type: "horizontalRule" });
                break;

            case "img": {
                const src = $el.attr("src") || "";
                const alt = $el.attr("alt") || "";
                const title = $el.attr("title") || "";

                if (src) {
                    const imageId = generateId();
                    const resolvedPath = resolveZipPath(xhtmlPath, src);

                    // Queue async image extraction
                    const loadPromise = (async () => {
                        const file = zip.file(resolvedPath);
                        if (file) {
                            const data = await file.async("arraybuffer");
                            images.push({
                                id: imageId,
                                data,
                                mimeType: guessMimeType(resolvedPath),
                            });
                        }
                    })();
                    pendingImageLoads.push(loadPromise);

                    nodes.push({
                        type: "image",
                        attrs: {
                            src: `__import_image__:${imageId}`,
                            alt: alt || null,
                            title: title || null,
                        },
                    });
                }
                break;
            }

            // Inline formatting marks
            case "strong":
            case "b": {
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                applyMarkToTextNodes(children, { type: "bold" });
                nodes.push(...children);
                break;
            }

            case "em":
            case "i": {
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                applyMarkToTextNodes(children, { type: "italic" });
                nodes.push(...children);
                break;
            }

            case "u": {
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                applyMarkToTextNodes(children, { type: "underline" });
                nodes.push(...children);
                break;
            }

            case "s":
            case "strike":
            case "del": {
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                applyMarkToTextNodes(children, { type: "strike" });
                nodes.push(...children);
                break;
            }

            case "code": {
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                applyMarkToTextNodes(children, { type: "code" });
                nodes.push(...children);
                break;
            }

            case "a": {
                const href = $el.attr("href") || "#";
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                applyMarkToTextNodes(children, {
                    type: "link",
                    attrs: { href },
                });
                nodes.push(...children);
                break;
            }

            case "span": {
                const children = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                const color = $el.css("color");
                const fontFamily = $el.css("font-family");
                if (color || fontFamily) {
                    const attrs: { color?: string; fontFamily?: string } = {};
                    if (color) attrs.color = color;
                    if (fontFamily) attrs.fontFamily = fontFamily;
                    const mark: TiptapMark = {
                        type: "textStyle",
                        attrs,
                    };
                    applyMarkToTextNodes(children, mark);
                }
                nodes.push(...children);
                break;
            }

            case "div":
            case "section":
            case "article":
            case "main":
            case "aside":
            case "header":
            case "footer":
            case "nav":
            case "figure":
            case "figcaption": {
                // Structural tags — descend into children
                const content = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                nodes.push(...content);
                break;
            }

            default: {
                // Unknown element — try to extract content
                const content = convertChildren(
                    $,
                    $el,
                    images,
                    zip,
                    xhtmlPath,
                    pendingImageLoads,
                );
                if (content.length) {
                    nodes.push(...content);
                }
                break;
            }
        }
    });

    return nodes;
}

/** Apply a mark to all text nodes in a tree recursively. */
function applyMarkToTextNodes(nodes: TiptapNode[], mark: TiptapMark): void {
    for (const node of nodes) {
        if (node.type === "text") {
            if (!node.marks) node.marks = [];
            node.marks.push(mark);
        } else if (node.content) {
            applyMarkToTextNodes(node.content, mark);
        }
    }
}

/**
 * Tiptap requires certain block nodes (listItem, blockquote) to contain
 * block-level children. If the children are all inline (text nodes),
 * wrap them in a paragraph.
 */
function wrapInlineInParagraph(nodes: TiptapNode[]): TiptapNode[] {
    if (nodes.length === 0) {
        return [{ type: "paragraph" }];
    }

    const inlineTypes = new Set(["text", "hardBreak", "image"]);
    const allInline = nodes.every((n) => inlineTypes.has(n.type));

    if (allInline) {
        return [{ type: "paragraph", content: nodes }];
    }

    // Mixed: group consecutive inline nodes into paragraphs
    const result: TiptapNode[] = [];
    let inlineBuf: TiptapNode[] = [];

    const flushInline = () => {
        if (inlineBuf.length) {
            result.push({ type: "paragraph", content: inlineBuf });
            inlineBuf = [];
        }
    };

    for (const node of nodes) {
        if (inlineTypes.has(node.type)) {
            inlineBuf.push(node);
        } else {
            flushInline();
            result.push(node);
        }
    }
    flushInline();

    return result;
}

// ─── EpubImportService ──────────────────────────────────────────────────────

export class EpubImportService implements IEpubImportService {
    async parseEpub(
        fileBuffer: ArrayBuffer,
        onProgress?: (percent: number) => void,
    ): Promise<ParsedEpub> {
        const report = (pct: number) => onProgress?.(Math.round(pct));

        // 1. Open the ZIP
        const zip = await JSZip.loadAsync(fileBuffer);
        report(5);

        // 2. Find the OPF path from META-INF/container.xml
        const containerXml = await this.readZipText(
            zip,
            "META-INF/container.xml",
        );
        if (!containerXml) {
            throw new Error("Invalid EPUB: missing META-INF/container.xml");
        }

        const $container = cheerio.load(containerXml, { xml: true });
        const opfPath = $container("rootfile").attr("full-path") ?? "";
        if (!opfPath) {
            throw new Error("Invalid EPUB: no rootfile found in container.xml");
        }
        report(8);

        // 3. Parse the OPF
        const opfXml = await this.readZipText(zip, opfPath);
        if (!opfXml) {
            throw new Error(`Invalid EPUB: cannot read ${opfPath}`);
        }

        const $opf = cheerio.load(opfXml, { xml: true });
        const title =
            $opf("dc\\:title, title").first().text().trim() ||
            "Imported Project";
        report(10);

        // 4. Build manifest map: id → { href, mediaType }
        const manifest = new Map<string, { href: string; mediaType: string }>();
        $opf("manifest item").each((_i, el) => {
            const id = $opf(el).attr("id") ?? "";
            const href = $opf(el).attr("href") ?? "";
            const mediaType = $opf(el).attr("media-type") ?? "";
            if (id && href) {
                manifest.set(id, {
                    href: resolveZipPath(opfPath, href),
                    mediaType,
                });
            }
        });

        // 5. Get spine order
        const spineItemRefs: string[] = [];
        $opf("spine itemref").each((_i, el) => {
            const idref = $opf(el).attr("idref") ?? "";
            if (idref) spineItemRefs.push(idref);
        });

        if (spineItemRefs.length === 0) {
            throw new Error("Invalid EPUB: no spine items found.");
        }

        // 6. Extract cover image
        let coverImage: ParsedEpub["coverImage"] = null;
        const coverMeta = $opf('meta[name="cover"]').attr("content") ?? "";
        const coverItem = coverMeta ? manifest.get(coverMeta) : null;
        if (coverItem) {
            const coverFile = zip.file(coverItem.href);
            if (coverFile) {
                coverImage = {
                    data: await coverFile.async("arraybuffer"),
                    mimeType:
                        coverItem.mediaType || guessMimeType(coverItem.href),
                };
            }
        }
        report(12);

        // 7. Process spine items into chapters
        const chapters: ParsedChapter[] = [];
        const totalSpine = spineItemRefs.length;

        for (let i = 0; i < totalSpine; i++) {
            const idref = spineItemRefs[i];
            const item = manifest.get(idref);
            if (!item) continue;

            const xhtmlPath = item.href;
            const xhtml = await this.readZipText(zip, xhtmlPath);
            if (!xhtml) continue;

            const chapter = await this.parseChapterXhtml(
                xhtml,
                xhtmlPath,
                zip,
                i + 1,
            );

            // Skip chapters with no text content (e.g. cover pages, TOC)
            if (chapter) {
                chapters.push(chapter);
            }

            // Progress: 12% – 95% across spine items
            report(12 + ((i + 1) / totalSpine) * 83);
        }

        if (chapters.length === 0) {
            throw new Error(
                "No importable chapters found in the EPUB. The file may be empty or only contain images/metadata.",
            );
        }

        report(100);

        return { title, coverImage, chapters };
    }

    private async parseChapterXhtml(
        xhtml: string,
        xhtmlPath: string,
        zip: JSZip,
        fallbackIndex: number,
    ): Promise<ParsedChapter | null> {
        const $ = cheerio.load(xhtml, { xml: false });

        // Determine chapter title from <title> or first <h1>
        let chapterTitle =
            $("title").first().text().trim() ||
            $("h1").first().text().trim() ||
            "";

        if (
            !chapterTitle ||
            chapterTitle.toLowerCase() === "untitled" ||
            chapterTitle.length > 200
        ) {
            chapterTitle = `Chapter ${fallbackIndex}`;
        }

        // Convert <body> children to Tiptap nodes
        const body = $("body");
        if (!body.length) return null;

        const images: ParsedImage[] = [];
        const pendingImageLoads: Promise<void>[] = [];

        const content = convertChildren(
            $,
            body,
            images,
            zip,
            xhtmlPath,
            pendingImageLoads,
        );

        // Wait for all image extractions to complete
        await Promise.all(pendingImageLoads);

        // Filter to only block-level nodes for the doc root
        const blockContent = wrapInlineInParagraph(content);

        // Check if there's actual text content
        const hasText = blockContent.some((node) => nodeHasText(node));
        if (!hasText) return null;

        const doc: TiptapNode = {
            type: "doc",
            content: blockContent,
        };

        return {
            title: chapterTitle,
            content: doc,
            images,
        };
    }

    private async readZipText(
        zip: JSZip,
        filePath: string,
    ): Promise<string | null> {
        const file = zip.file(filePath);
        if (!file) return null;
        return file.async("text");
    }
}

function nodeHasText(node: TiptapNode): boolean {
    if (node.type === "text" && node.text?.trim()) return true;
    if (node.content) {
        return node.content.some(nodeHasText);
    }
    return false;
}
