/**
 * Custom Tiptap extension for document references using "/" trigger.
 * Renders as clickable links within the Tiptap rich text editor.
 */
import { Mention, type MentionOptions } from "@tiptap/extension-mention";
import { type SuggestionOptions } from "@tiptap/suggestion";
import { mergeAttributes } from "@tiptap/core";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { DocumentRef, DocumentRefKind } from "../components/ui/ListInput";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentReferenceOptions
    extends Omit<MentionOptions, "suggestion"> {
    suggestion: Partial<SuggestionOptions<DocumentRef>>;
    onReferenceClick?: (ref: DocumentRef) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getIconSvg(kind: DocumentRefKind): string {
    const props =
        'width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

    switch (kind) {
        case "chapter":
            // BinderChapterIcon
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M4 5a3 3 0 0 1 3-3h12v18H7a3 3 0 0 0-3 3z" /><path d="M4 5v18" /><path d="M8 7h8" /><path d="M8 11h8" /></svg>`;
        case "character":
            // PersonIcon
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
        case "location":
            // MapIcon
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>`;
        case "organization":
            // BinderOrganizationIcon
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M6 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17" /><path d="M4 22h16" /><path d="M10 8h1" /><path d="M13 8h1" /><path d="M10 12h1" /><path d="M13 12h1" /><path d="M11 22v-4h2v4" /></svg>`;
        case "scrapNote":
            // BinderScrapNoteIcon
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M8 12h8" /><path d="M8 16h6" /></svg>`;
        default:
            // FileTextIcon (fallback)
            return `<svg xmlns="http://www.w3.org/2000/svg" ${props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Suggestion Renderer (Vanilla JS - creates a simple dropdown list)
// ─────────────────────────────────────────────────────────────────────────────

interface SuggestionRendererProps {
    items: DocumentRef[];
    command: (props: DocumentRef) => void;
}

class SuggestionListRenderer {
    element: HTMLElement;
    items: DocumentRef[] = [];
    selectedIndex = 0;
    command: ((props: DocumentRef) => void) | null = null;

    constructor() {
        this.element = document.createElement("div");
        this.element.className = "tiptap-document-ref-dropdown";
    }

    private getKindLabel(kind: DocumentRefKind): string {
        switch (kind) {
            case "chapter":
                return "Chapter";
            case "scrapNote":
                return "Note";
            case "character":
                return "Character";
            case "location":
                return "Location";
            case "organization":
                return "Organization";
            default:
                return "";
        }
    }

    render() {
        if (!this.items.length) {
            this.element.innerHTML = `
                <div class="tiptap-ref-empty">
                    No documents found
                </div>
            `;
            return;
        }

        this.element.innerHTML = this.items
            .map(
                (item, index) => `
                <div 
                    class="tiptap-ref-item ${index === this.selectedIndex ? "tiptap-ref-item-selected" : ""}"
                    data-index="${index}"
                >
                    <span class="tiptap-ref-icon">${getIconSvg(item.kind)}</span>
                    <span class="tiptap-ref-name">${item.name}</span>
                    <span class="tiptap-ref-kind">${this.getKindLabel(item.kind)}</span>
                </div>
            `
            )
            .join("");

        // Add click handlers
        this.element.querySelectorAll(".tiptap-ref-item").forEach((el) => {
            el.addEventListener("click", (e) => {
                const index = parseInt(
                    (e.currentTarget as HTMLElement).dataset.index || "0",
                    10
                );
                this.selectItem(index);
            });
        });
    }

    updateProps(props: SuggestionRendererProps) {
        this.items = props.items;
        this.command = props.command;
        this.selectedIndex = 0;
        this.render();
    }

    selectItem(index: number) {
        const item = this.items[index];
        if (item && this.command) {
            this.command(item);
        }
    }

    upHandler() {
        this.selectedIndex =
            (this.selectedIndex + this.items.length - 1) % this.items.length;
        this.render();
    }

    downHandler() {
        this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
        this.render();
    }

    enterHandler() {
        this.selectItem(this.selectedIndex);
    }

    onKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowUp") {
            this.upHandler();
            return true;
        }
        if (event.key === "ArrowDown") {
            this.downHandler();
            return true;
        }
        if (event.key === "Enter") {
            this.enterHandler();
            return true;
        }
        return false;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extension Factory
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateDocumentReferenceSuggestionOptions {
    availableDocuments: DocumentRef[] | (() => DocumentRef[]);
    onReferenceClick?: (ref: DocumentRef) => void;
}

export function createDocumentReferenceSuggestion(
    options: CreateDocumentReferenceSuggestionOptions
): Partial<SuggestionOptions<DocumentRef>> {
    let renderer: SuggestionListRenderer | null = null;
    let popup: TippyInstance | null = null;

    const getDocuments = (): DocumentRef[] => {
        if (Array.isArray(options.availableDocuments)) {
            return options.availableDocuments;
        }
        return options.availableDocuments();
    };

    return {
        char: "/",
        allowSpaces: false,
        startOfLine: false,

        items: ({ query }) => {
            const lowerQuery = query.toLowerCase();
            return getDocuments()
                .filter((doc) => doc.name.toLowerCase().includes(lowerQuery))
                .slice(0, 10);
        },

        // Map the item properties to node attributes
        // The Mention extension expects { id, label }, but our items have { id, name, kind }
        command: ({ editor, range, props }) => {
            // Delete the trigger character and query, then insert the mention node
            editor
                .chain()
                .focus()
                .insertContentAt(range, [
                    {
                        type: "documentReference",
                        attrs: {
                            id: props.id,
                            label: props.name, // Map 'name' to 'label'
                            kind: props.kind,
                        },
                    },
                    {
                        type: "text",
                        text: " ",
                    },
                ])
                .run();
        },

        render: () => {
            return {
                onStart: (props) => {
                    renderer = new SuggestionListRenderer();
                    renderer.updateProps({
                        items: props.items,
                        command: props.command,
                    });

                    if (!props.clientRect) return;

                    popup = tippy(document.body, {
                        getReferenceClientRect: () =>
                            props.clientRect() as DOMRect,
                        appendTo: () => document.body,
                        content: renderer.element,
                        showOnCreate: true,
                        interactive: true,
                        trigger: "manual",
                        placement: "bottom-start",
                        theme: "document-reference",
                        arrow: false,
                        maxWidth: 400,
                    });
                },

                onUpdate: (props) => {
                    if (!renderer) return;

                    renderer.updateProps({
                        items: props.items,
                        command: props.command,
                    });

                    if (popup && props.clientRect) {
                        popup.setProps({
                            getReferenceClientRect: () =>
                                props.clientRect() as DOMRect,
                        });
                    }
                },

                onKeyDown: (props) => {
                    if (props.event.key === "Escape") {
                        popup?.hide();
                        return true;
                    }
                    return renderer?.onKeyDown(props.event) ?? false;
                },

                onExit: () => {
                    popup?.destroy();
                    popup = null;
                    renderer = null;
                },
            };
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentReference Extension
// ─────────────────────────────────────────────────────────────────────────────

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        documentReference: {
            setDocumentReference: (attrs: {
                id: string;
                label: string;
                kind: DocumentRefKind;
            }) => ReturnType;
        };
    }
}

export const DocumentReference = Mention.extend<DocumentReferenceOptions>({
    name: "documentReference",

    addOptions() {
        return {
            ...this.parent?.(),
            HTMLAttributes: {
                class: "tiptap-document-reference",
            },
            renderHTML: undefined,
            renderText: undefined,
            deleteTriggerWithBackspace: true,
            suggestion: {},
        };
    },

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-id"),
                renderHTML: (attributes) => ({
                    "data-id": attributes.id,
                }),
            },
            label: {
                default: null,
                parseHTML: (element) => element.getAttribute("data-label"),
                renderHTML: (attributes) => ({
                    "data-label": attributes.label,
                }),
            },
            kind: {
                default: "chapter",
                parseHTML: (element) =>
                    (element.getAttribute("data-kind") as DocumentRefKind) ||
                    "chapter",
                renderHTML: (attributes) => ({
                    "data-kind": attributes.kind,
                }),
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: `span[data-type="${this.name}"]`,
            },
        ];
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            "span",
            mergeAttributes(
                { "data-type": this.name },
                this.options.HTMLAttributes,
                HTMLAttributes
            ),
            `${node.attrs.label ?? node.attrs.id}`,
        ];
    },

    renderText({ node }) {
        return node.attrs.label ?? node.attrs.id;
    },

    addCommands() {
        return {
            setDocumentReference:
                (attrs) =>
                ({ chain }) => {
                    return chain()
                        .focus()
                        .insertContent([
                            {
                                type: this.name,
                                attrs,
                            },
                            {
                                type: "text",
                                text: " ",
                            },
                        ])
                        .run();
                },
        };
    },

    addNodeView() {
        // Using native rendering, but with click handlers
        return ({ node }) => {
            const span = document.createElement("span");
            span.className = `tiptap-document-reference tiptap-ref-kind-${node.attrs.kind}`;
            span.setAttribute("data-type", this.name);
            span.setAttribute("data-id", node.attrs.id);
            span.setAttribute("data-label", node.attrs.label);
            span.setAttribute("data-kind", node.attrs.kind);

            // Display the document name (label), not the ID
            // Icon is handled via CSS ::before to ensure it appears in static renderHTML too
            span.textContent = node.attrs.label || "Untitled";

            span.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Emit a custom event that can be caught by the parent component
                const event = new CustomEvent("document-reference-click", {
                    bubbles: true,
                    detail: {
                        id: node.attrs.id,
                        name: node.attrs.label,
                        kind: node.attrs.kind,
                    },
                });
                span.dispatchEvent(event);
            });

            return {
                dom: span,
            };
        };
    },
});

export default DocumentReference;
