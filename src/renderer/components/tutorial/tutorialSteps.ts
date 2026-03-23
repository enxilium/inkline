export type TutorialActionKind =
    | "create-chapter"
    | "switch-character-tab"
    | "create-character"
    | "open-template-editor"
    | "save-template"
    | "split-pane";

export type TutorialStep = {
    id: string;
    message: string;
    targetId: string;
    action?: TutorialActionKind;
    actionLabel?: string;
    fallbackAfterMs?: number;
};

const ACTION_FALLBACK_MS = 20000;

export const TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: "intro",
        message:
            "Welcome to Inkline! I'm Inky, and I'm here to get you onboarded.",
        targetId: "workspace-layout-root",
    },
    {
        id: "binder",
        message:
            "This is the document binder. It contains your project's documents.",
        targetId: "binder-panel",
    },
    {
        id: "chapter-plus",
        message: "Try clicking this plus button to create your first chapter!",
        targetId: "binder-create-chapter-button",
        action: "create-chapter",
        actionLabel: "Create a chapter using the plus button.",
        fallbackAfterMs: ACTION_FALLBACK_MS,
    },
    {
        id: "editor",
        message:
            "Bravo! This is the editor. It's where most of your time will be spent on. You can format your text as you see fit.",
        targetId: "workspace-layout-root",
    },
    {
        id: "switcher",
        message:
            "Down here is the binder switcher. You can swap the binder to display different kinds of files: chapters, scrap notes, characters, locations, or organizations. Try switching to the Character tab!",
        targetId: "binder-switcher-character-tab",
        action: "switch-character-tab",
        actionLabel: "Switch to the Character tab.",
        fallbackAfterMs: ACTION_FALLBACK_MS,
    },
    {
        id: "character-plus",
        message: "Click the plus button to create a new character.",
        targetId: "binder-create-character-button",
        action: "create-character",
        actionLabel: "Create a character using the plus button.",
        fallbackAfterMs: ACTION_FALLBACK_MS,
    },
    {
        id: "character-editor",
        message:
            "This is the character editor! It's much more organized than the chapter editor, and you can customize fields as you see fit!",
        targetId: "workspace-layout-root",
    },
    {
        id: "template-open",
        message: "Here is the Template Editor. Try clicking it!",
        targetId: "binder-template-button",
        action: "open-template-editor",
        actionLabel: "Open the template editor with the pencil button.",
        fallbackAfterMs: ACTION_FALLBACK_MS,
    },
    {
        id: "template-metafield",
        message:
            "Here, you can create new metafield that your story's characters need, for example a categorization field unique to your power system.",
        targetId: "template-editor-dialog",
    },
    {
        id: "template-drag",
        message:
            "You can also drag cards around to position them exactly the way you want it in this section!",
        targetId: "template-first-card-drag-handle",
    },
    {
        id: "template-save",
        message:
            'Press "Save Template" to save your changes. This will propagate across all your existing and future characters.',
        targetId: "template-save-button",
        action: "save-template",
        actionLabel: "Save the template to continue.",
        fallbackAfterMs: ACTION_FALLBACK_MS,
    },
    {
        id: "location-org",
        message:
            "Location and Organization type documents are similar to characters, and have their own template editors as well.",
        targetId: "binder-panel",
    },
    {
        id: "split-action",
        message:
            "Now, try dragging the Character tab to the left side of the main editor!",
        targetId: "workspace-layout-root",
        action: "split-pane",
        actionLabel:
            "Create a split pane by dragging a tab in the editor layout.",
        fallbackAfterMs: ACTION_FALLBACK_MS,
    },
    {
        id: "split-explainer",
        message:
            "This is the split pane view. You can continue dragging tabs around as needed and the layout will adjust to fit your style!",
        targetId: "workspace-layout-root",
    },
    {
        id: "export",
        message:
            "When you're ready, click File -> Export Manuscript to export your chapters in EPUB format. Happy writing!",
        targetId: "titlebar-file-menu-button",
    },
];
