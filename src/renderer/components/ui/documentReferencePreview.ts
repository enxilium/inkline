import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { DocumentRef, DocumentRefKind } from "./ListInput";

const isWordContinuation = (value: string): boolean =>
    /^[\p{L}\p{N}_'’-]/u.test(value);

export const isElementPartOfLanguageToolProblem = (
    anchor: HTMLElement,
): boolean => {
    if (anchor.closest(".lt")) {
        return true;
    }

    const editorRoot =
        anchor.closest(".editor-body") ||
        anchor.closest(".rich-textarea-input") ||
        anchor.parentElement;

    if (!editorRoot) {
        return false;
    }

    const nextSibling = anchor.nextSibling;
    if (nextSibling instanceof Text) {
        const value = nextSibling.textContent || "";
        if (value.length > 0 && isWordContinuation(value)) {
            const nextElement = nextSibling.nextSibling;
            if (
                nextElement instanceof HTMLElement &&
                nextElement.classList.contains("lt")
            ) {
                return true;
            }
        }
    }

    if (
        nextSibling instanceof HTMLElement &&
        nextSibling.classList.contains("lt") &&
        isWordContinuation(nextSibling.textContent || "")
    ) {
        return true;
    }

    const previousSibling = anchor.previousSibling;
    if (
        previousSibling instanceof HTMLElement &&
        previousSibling.classList.contains("lt") &&
        isWordContinuation(anchor.textContent || "")
    ) {
        return true;
    }

    if (
        previousSibling instanceof Text &&
        isWordContinuation(anchor.textContent || "")
    ) {
        const prevElement = previousSibling.previousSibling;
        if (
            prevElement instanceof HTMLElement &&
            prevElement.classList.contains("lt")
        ) {
            return true;
        }
    }

    return false;
};

type PreviewContent = {
    title: string;
    bodyHtml: string;
    kind: DocumentRefKind;
};

const ALLOWED_TAGS = new Set([
    "P",
    "BR",
    "A",
    "STRONG",
    "EM",
    "U",
    "S",
    "CODE",
    "PRE",
    "H1",
    "H2",
    "H3",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "HR",
    "IMG",
]);

const escapeHtml = (text: string): string =>
    text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

const getKindIconSvg = (kind: DocumentRefKind): string => {
    const props =
        'width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

    switch (kind) {
        case "chapter":
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M4 5a3 3 0 0 1 3-3h12v18H7a3 3 0 0 0-3 3z" /><path d="M4 5v18" /><path d="M8 7h8" /><path d="M8 11h8" /></svg>`;
        case "scrapNote":
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8 12h8" /><path d="M8 16h6" /></svg>`;
        case "character":
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
        case "location":
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>`;
        case "organization":
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M6 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" /><path d="M4 22h16" /><path d="M10 8h1" /><path d="M13 8h1" /><path d="M10 12h1" /><path d="M13 12h1" /><path d="M11 22v-4h2v4" /></svg>`;
        default:
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    }
};

type TiptapMark = {
    type?: unknown;
    attrs?: unknown;
};

type TiptapNode = {
    type?: unknown;
    text?: unknown;
    attrs?: unknown;
    marks?: unknown;
    content?: unknown;
};

const escapeAttr = (text: string): string =>
    text
        .replace(/&/g, "&amp;")
        .replace(/\"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const renderMarks = (text: string, marks: TiptapMark[]): string => {
    let html = escapeHtml(text);

    for (const mark of marks) {
        const markType = typeof mark.type === "string" ? mark.type : "";
        const attrs =
            mark.attrs && typeof mark.attrs === "object"
                ? (mark.attrs as Record<string, unknown>)
                : null;

        switch (markType) {
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
                const href =
                    typeof attrs?.href === "string" && attrs.href.length > 0
                        ? attrs.href
                        : "#";
                html = `<a href="${escapeAttr(href)}" target="_blank" rel="noreferrer noopener">${html}</a>`;
                break;
            }
            case "textStyle": {
                const styles: string[] = [];
                if (typeof attrs?.color === "string" && attrs.color.trim()) {
                    styles.push(`color: ${attrs.color}`);
                }
                if (
                    typeof attrs?.fontFamily === "string" &&
                    attrs.fontFamily.trim()
                ) {
                    styles.push(`font-family: ${attrs.fontFamily}`);
                }

                if (styles.length) {
                    html = `<span style="${escapeAttr(styles.join("; "))}">${html}</span>`;
                }
                break;
            }
            default:
                break;
        }
    }

    return html;
};

const renderTiptapNode = (node: TiptapNode): string => {
    const type = typeof node.type === "string" ? node.type : "";
    const attrs =
        node.attrs && typeof node.attrs === "object"
            ? (node.attrs as Record<string, unknown>)
            : null;
    const children = Array.isArray(node.content)
        ? (node.content as unknown[])
              .filter((item): item is TiptapNode =>
                  Boolean(item && typeof item === "object"),
              )
              .map(renderTiptapNode)
              .join("")
        : "";

    if (type === "text") {
        const text = typeof node.text === "string" ? node.text : "";
        const marks = Array.isArray(node.marks)
            ? (node.marks.filter((mark): mark is TiptapMark =>
                  Boolean(mark && typeof mark === "object"),
              ) as TiptapMark[])
            : [];
        return renderMarks(text, marks);
    }

    switch (type) {
        case "doc":
            return children;
        case "paragraph":
            return `<p>${children || "&nbsp;"}</p>`;
        case "heading": {
            const levelRaw = Number(attrs?.level);
            const level =
                Number.isFinite(levelRaw) && levelRaw >= 1 && levelRaw <= 3
                    ? levelRaw
                    : 2;
            return `<h${level}>${children}</h${level}>`;
        }
        case "bulletList":
            return `<ul>${children}</ul>`;
        case "orderedList":
            return `<ol>${children}</ol>`;
        case "listItem":
            return `<li>${children}</li>`;
        case "blockquote":
            return `<blockquote>${children}</blockquote>`;
        case "codeBlock":
            return `<pre><code>${children}</code></pre>`;
        case "hardBreak":
            return "<br/>";
        case "horizontalRule":
            return "<hr/>";
        case "image": {
            const src =
                typeof attrs?.src === "string" && attrs.src.trim()
                    ? attrs.src
                    : "";
            if (!src) {
                return "";
            }
            const alt = typeof attrs?.alt === "string" ? attrs.alt : "";
            return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}"/>`;
        }
        case "documentReference": {
            const label =
                typeof attrs?.label === "string"
                    ? attrs.label
                    : typeof attrs?.id === "string"
                      ? attrs.id
                      : "";
            return escapeHtml(label);
        }
        default:
            return children;
    }
};

const renderTiptapJsonToHtml = (raw: string): string => {
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== "object") {
            return "";
        }

        return renderTiptapNode(parsed as TiptapNode).trim();
    } catch {
        return "";
    }
};

const sanitizePreviewHtml = (rawHtml: string): string => {
    if (!rawHtml.trim()) {
        return "";
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    const sanitizeElement = (element: Element): void => {
        const children = Array.from(element.children);
        for (const child of children) {
            sanitizeElement(child);
        }

        if (!ALLOWED_TAGS.has(element.tagName)) {
            const text = doc.createTextNode(element.textContent || "");
            element.replaceWith(text);
            return;
        }

        const attrs = Array.from(element.attributes);
        for (const attr of attrs) {
            const attrName = attr.name.toLowerCase();
            const isHref = element.tagName === "A" && attrName === "href";
            const isSafeImgSrc =
                element.tagName === "IMG" &&
                (attrName === "src" || attrName === "alt");
            const isStyle = attrName === "style";

            if (isHref || isSafeImgSrc || isStyle) {
                continue;
            }

            element.removeAttribute(attr.name);
        }

        if (element.tagName === "A") {
            const href = element.getAttribute("href") || "";
            if (!/^https?:\/\//i.test(href) && !href.startsWith("#")) {
                element.setAttribute("href", "#");
            }
            element.setAttribute("target", "_blank");
            element.setAttribute("rel", "noreferrer noopener");
        }
    };

    const bodyChildren = Array.from(doc.body.children);
    for (const child of bodyChildren) {
        sanitizeElement(child);
    }

    return doc.body.innerHTML.trim();
};

const toPlainHtml = (content: string): string => {
    const normalized = content.trim();
    if (!normalized) {
        return "";
    }

    return `<p>${escapeHtml(normalized)}</p>`;
};

const toBodyHtml = (ref: DocumentRef): string => {
    const raw = ref.previewContent || "";
    if (!raw.trim()) {
        return "";
    }

    if (ref.previewContentType === "tiptap-json") {
        const html = renderTiptapJsonToHtml(raw);
        return sanitizePreviewHtml(html);
    }

    if (ref.previewContentType === "html") {
        const sanitized = sanitizePreviewHtml(raw);
        return sanitized;
    }

    return toPlainHtml(raw);
};

export const buildReferencePreviewContent = (
    ref: DocumentRef,
): PreviewContent => {
    const title = (ref.previewTitle || ref.name || "Untitled").trim();
    const bodyHtml = toBodyHtml(ref);

    return {
        title: title || "Untitled",
        bodyHtml,
        kind: ref.kind,
    };
};

export const renderReferencePreviewCard = (ref: DocumentRef): string => {
    const preview = buildReferencePreviewContent(ref);
    const body =
        preview.bodyHtml.length > 0
            ? `<div class="tiptap-ref-preview-body">${preview.bodyHtml}</div>`
            : `<div class="tiptap-ref-preview-empty">No content</div>`;

    return `
        <div class="tiptap-ref-preview-card" data-kind="${preview.kind}">
            <div class="tiptap-ref-preview-header">
                <span class="tiptap-ref-preview-icon" aria-hidden="true">${getKindIconSvg(preview.kind)}</span>
                <span class="tiptap-ref-preview-title">${escapeHtml(preview.title)}</span>
            </div>
            <div class="tiptap-ref-preview-fade-wrap">
                ${body}
            </div>
        </div>
    `.trim();
};

export const createReferencePreviewPopup = (
    anchor: HTMLElement,
    ref: DocumentRef,
): TippyInstance => {
    return tippy(anchor, {
        content: renderReferencePreviewCard(ref),
        allowHTML: true,
        appendTo: () => document.body,
        trigger: "manual",
        placement: "top",
        theme: "document-reference-preview",
        interactive: false,
        arrow: false,
        maxWidth: 340,
        offset: [0, 10],
        delay: [150, 0],
        onShow: () => {
            if (isElementPartOfLanguageToolProblem(anchor)) {
                return false;
            }
        },
    });
};

export const createReferenceLookup = (
    availableDocuments: DocumentRef[],
): Map<string, DocumentRef> => {
    const map = new Map<string, DocumentRef>();
    for (const ref of availableDocuments) {
        map.set(`${ref.kind}:${ref.id}`, ref);
    }
    return map;
};

export const getReferenceKey = (kind: DocumentRefKind, id: string): string =>
    `${kind}:${id}`;
