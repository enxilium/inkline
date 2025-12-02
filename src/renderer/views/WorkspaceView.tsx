import React from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextAlign } from "@tiptap/extension-text-align";

import type {
    WorkspaceDocumentRef,
    WorkspaceChapter,
    WorkspaceScrapNote,
} from "../types";
import { ensureRendererApi } from "../utils/api";
import { useAppStore } from "../state/appStore";
import { ToolbarButton } from "../components/ToolbarButton";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { LinkDialog } from "../components/dialogs/LinkDialog";
import { ExportDialog } from "../components/dialogs/ExportDialog";
import { DocumentBinder } from "../components/workspace/DocumentBinder";
import {
    CharacterEditor,
    type CharacterEditorValues,
} from "../components/workspace/CharacterEditor";
import {
    LocationEditor,
    type LocationEditorValues,
} from "../components/workspace/LocationEditor";
import {
    OrganizationEditor,
    type OrganizationEditorValues,
} from "../components/workspace/OrganizationEditor";

const AUTOSAVE_DELAY_MS = 1200;

type UseCaseShortcut = {
    id: string;
    title: string;
    description: string;
    category: string;
    run: () => Promise<void>;
};

const fontOptions = [
    { label: "Body Default (Inter)", value: "" },
    { label: "Inter", value: "'InterVariable', 'Inter', sans-serif" },
    { label: "Roboto", value: "'Roboto', sans-serif" },
    { label: "Open Sans", value: "'Open Sans', sans-serif" },
    { label: "Lato", value: "'Lato', sans-serif" },
    { label: "Montserrat", value: "'Montserrat', sans-serif" },
    { label: "Source Sans 3", value: "'Source Sans 3', sans-serif" },
    { label: "Work Sans", value: "'Work Sans', sans-serif" },
    { label: "Nunito", value: "'Nunito', sans-serif" },
    { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
    { label: "Merriweather", value: "'Merriweather', serif" },
    { label: "Source Serif 4", value: "'Source Serif 4', serif" },
    { label: "Lora", value: "'Lora', serif" },
    { label: "Playfair Display", value: "'Playfair Display', serif" },
    { label: "Crimson Pro", value: "'Crimson Pro', serif" },
    { label: "Roboto Slab", value: "'Roboto Slab', serif" },
    { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace" },
];

const rendererApi = ensureRendererApi();

type ActiveTextDocument =
    | { kind: "chapter"; data: WorkspaceChapter }
    | { kind: "scrapNote"; data: WorkspaceScrapNote }
    | null;

const listFromMultiline = (value: string): string[] =>
    value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

export const WorkspaceView: React.FC = () => {
    const {
        projectId,
        activeProjectName,
        chapters,
        scrapNotes,
        characters,
        locations,
        organizations,
        assets,
        activeDocument,
        setActiveDocument,
        createChapterEntry,
        createScrapNoteEntry,
        createCharacterEntry,
        createLocationEntry,
        createOrganizationEntry,
        autosaveStatus,
        setAutosaveStatus,
        autosaveError,
        setAutosaveError,
        lastSavedAt,
        setLastSavedAt,
        updateChapterLocally,
        updateScrapNoteLocally,
        updateCharacterLocally,
        updateLocationLocally,
        updateOrganizationLocally,
        deleteChapter,
        deleteScrapNote,
        deleteCharacter,
        deleteLocation,
        deleteOrganization,
        reorderChapters,
        shortcutStates,
        setShortcutState,
        resetShortcutState,
        reloadActiveProject,
        returnToProjects,
    } = useAppStore();

    const [generationProgress, setGenerationProgress] = React.useState<{
        type: string;
        progress: number;
    } | null>(null);

    const [isExportDialogOpen, setIsExportDialogOpen] = React.useState(false);

    React.useEffect(() => {
        const events = (window as any).generationEvents;
        if (events) {
            events.onProgress((data: { type: string; progress: number }) => {
                setGenerationProgress(data);
                if (data.progress >= 100) {
                    setTimeout(() => setGenerationProgress(null), 3000);
                }
            });
        }
    }, []);

    const editor = useEditor({
        extensions: [
            Color.configure({ types: ["textStyle"] }),
            TextStyle,
            FontFamily.configure({ types: ["textStyle"] }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
                link: {
                    autolink: true,
                    linkOnPaste: true,
                    openOnClick: false,
                },
                underline: {},
            }),
        ],
        content: "<p></p>",
        editorProps: {
            attributes: {
                class: "editor-body",
                spellCheck: "true",
            },
        },
    });

    const [, forceUpdate] = React.useState(0);
    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const shortcutTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({});
    const [isLinkDialogOpen, setLinkDialogOpen] = React.useState(false);
    const [pendingLinkUrl, setPendingLinkUrl] = React.useState("");
    const [textTitle, setTextTitle] = React.useState("");
    const [isTitleSaving, setTitleSaving] = React.useState(false);

    const resolveStoredImageUrls = React.useCallback(
        (galleryIds: string[]): string[] =>
            galleryIds
                .map((id) => assets.images[id]?.url)
                .filter((url): url is string => Boolean(url)),
        [assets.images]
    );

    const activeChapter = React.useMemo(() => {
        if (activeDocument?.kind !== "chapter") {
            return null;
        }
        return (
            chapters.find((chapter) => chapter.id === activeDocument.id) ?? null
        );
    }, [activeDocument, chapters]);

    const activeScrapNote = React.useMemo(() => {
        if (activeDocument?.kind !== "scrapNote") {
            return null;
        }
        return scrapNotes.find((note) => note.id === activeDocument.id) ?? null;
    }, [activeDocument, scrapNotes]);

    const activeTextDocument = React.useMemo<ActiveTextDocument>(() => {
        if (activeChapter) {
            return { kind: "chapter", data: activeChapter };
        }
        if (activeScrapNote) {
            return { kind: "scrapNote", data: activeScrapNote };
        }
        return null;
    }, [activeChapter, activeScrapNote]);

    const activeCharacter = React.useMemo(() => {
        if (activeDocument?.kind !== "character") {
            return null;
        }
        return (
            characters.find(
                (character) => character.id === activeDocument.id
            ) ?? null
        );
    }, [activeDocument, characters]);

    const activeLocation = React.useMemo(() => {
        if (activeDocument?.kind !== "location") {
            return null;
        }
        return (
            locations.find((location) => location.id === activeDocument.id) ??
            null
        );
    }, [activeDocument, locations]);

    const activeOrganization = React.useMemo(() => {
        if (activeDocument?.kind !== "organization") {
            return null;
        }
        return (
            organizations.find(
                (organization) => organization.id === activeDocument.id
            ) ?? null
        );
    }, [activeDocument, organizations]);

    React.useEffect(() => {
        if (activeTextDocument) {
            const title =
                activeTextDocument.kind === "chapter"
                    ? activeTextDocument.data.title || "Untitled Chapter"
                    : activeTextDocument.data.title || "Untitled Note";
            setTextTitle(title);
        } else {
            setTextTitle("");
        }
    }, [
        activeTextDocument?.data.id,
        activeTextDocument?.kind,
        activeTextDocument?.data.title,
    ]);

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        if (activeTextDocument) {
            const contentStr = activeTextDocument.data.content;
            const currentJSON = JSON.stringify(editor.getJSON());

            // Default empty doc if content is missing
            const targetContent =
                contentStr || JSON.stringify({ type: "doc", content: [] });

            // Try to parse as JSON first (for Chapters and migrated ScrapNotes)
            try {
                // If we can parse it as JSON, we treat it as a Tiptap document
                const json = JSON.parse(targetContent);

                // Only update if the content is actually different
                // This prevents cursor jumping during typing (optimistic updates)
                if (JSON.stringify(json) !== currentJSON) {
                    editor.commands.setContent(json, { emitUpdate: false });
                }
            } catch (e) {
                // Fallback: It's likely HTML (legacy ScrapNote) or plain text
                // We load it as HTML/Text. Next save will convert it to JSON.
                const html = contentStr || "<p></p>";
                if (editor.getHTML() !== html) {
                    editor.commands.setContent(html, { emitUpdate: false });
                }
            }
        } else {
            editor.commands.clearContent(true);
        }
    }, [editor, activeTextDocument]);

    const flushAutosave = React.useCallback(async () => {
        if (!projectId || !editor || !activeTextDocument) {
            setAutosaveStatus("disabled");
            return;
        }

        try {
            setAutosaveStatus("saving");
            setAutosaveError(null);

            // Always save as JSON for consistency and performance
            const content = JSON.stringify(editor.getJSON());

            if (activeTextDocument.kind === "chapter") {
                await rendererApi.logistics.saveChapterContent({
                    chapterId: activeTextDocument.data.id,
                    content,
                });
                updateChapterLocally(activeTextDocument.data.id, {
                    content,
                    updatedAt: new Date(),
                });
            } else {
                await rendererApi.manuscript.updateScrapNote({
                    scrapNoteId: activeTextDocument.data.id,
                    content,
                });
                updateScrapNoteLocally(activeTextDocument.data.id, {
                    content,
                    updatedAt: new Date(),
                });
            }

            setAutosaveStatus("saved");
            setLastSavedAt(Date.now());
        } catch (error) {
            setAutosaveStatus("error");
            setAutosaveError((error as Error)?.message ?? "Autosave failed.");
        }
    }, [
        projectId,
        editor,
        activeTextDocument,
        setAutosaveStatus,
        setAutosaveError,
        setLastSavedAt,
        updateChapterLocally,
        updateScrapNoteLocally,
    ]);

    const scheduleAutosave = React.useCallback(() => {
        if (!activeTextDocument || !editor) {
            setAutosaveStatus("disabled");
            return;
        }

        setAutosaveStatus("pending");
        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }
        autosaveTimerRef.current = setTimeout(() => {
            flushAutosave().catch(() => {
                /* handled via setAutosaveError */
            });
        }, AUTOSAVE_DELAY_MS);
    }, [activeTextDocument, editor, flushAutosave, setAutosaveStatus]);

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        const rerender = () => forceUpdate((prev) => prev + 1);
        const autosaveListener = () => scheduleAutosave();
        editor.on("selectionUpdate", rerender);
        editor.on("transaction", rerender);
        editor.on("update", autosaveListener);

        return () => {
            editor.off("selectionUpdate", rerender);
            editor.off("transaction", rerender);
            editor.off("update", autosaveListener);
        };
    }, [editor, scheduleAutosave]);

    React.useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
            Object.values(shortcutTimersRef.current).forEach((timer) =>
                clearTimeout(timer)
            );
        };
    }, []);

    React.useEffect(() => {
        if (!activeTextDocument) {
            setAutosaveStatus("disabled");
            setAutosaveError(null);
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        } else if (autosaveStatus === "disabled") {
            setAutosaveStatus("idle");
        }
    }, [
        activeTextDocument,
        autosaveStatus,
        setAutosaveError,
        setAutosaveStatus,
    ]);

    const handleLinkSubmit = (url: string) => {
        if (!editor) {
            return;
        }

        if (!url) {
            editor.chain().focus().unsetLink().run();
            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    };

    const openLinkDialog = () => {
        if (!editor) {
            return;
        }
        const previousUrl = editor.getAttributes("link").href ?? "";
        setPendingLinkUrl(previousUrl);
        setLinkDialogOpen(true);
    };

    const clearFormatting = () => {
        editor?.chain().focus().unsetAllMarks().clearNodes().run();
    };

    const blockValue = React.useMemo(() => {
        if (!editor) {
            return "paragraph";
        }
        if (editor.isActive("heading", { level: 1 })) {
            return "h1";
        }
        if (editor.isActive("heading", { level: 2 })) {
            return "h2";
        }
        if (editor.isActive("heading", { level: 3 })) {
            return "h3";
        }
        return "paragraph";
    }, [editor, forceUpdate]);

    const autosaveLabel = React.useMemo(() => {
        switch (autosaveStatus) {
            case "saving":
                return "Autosaving…";
            case "pending":
                return "Queued";
            case "saved":
                return lastSavedAt
                    ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                    : "Saved";
            case "error":
                return "Autosave failed";
            case "disabled":
                return "Autosave disabled";
            default:
                return "Autosave idle";
        }
    }, [autosaveStatus, lastSavedAt]);

    const autosaveClass = React.useMemo(() => {
        switch (autosaveStatus) {
            case "saving":
            case "pending":
                return "is-warning";
            case "saved":
                return "is-success";
            case "error":
                return "is-error";
            case "disabled":
                return "is-muted";
            default:
                return "";
        }
    }, [autosaveStatus]);

    const runShortcut = React.useCallback(
        async (shortcut: UseCaseShortcut): Promise<void> => {
            setShortcutState(shortcut.id, { status: "running" });
            try {
                await shortcut.run();
                setShortcutState(shortcut.id, { status: "success" });
                if (shortcutTimersRef.current[shortcut.id]) {
                    clearTimeout(shortcutTimersRef.current[shortcut.id]);
                }
                shortcutTimersRef.current[shortcut.id] = setTimeout(() => {
                    resetShortcutState(shortcut.id);
                    delete shortcutTimersRef.current[shortcut.id];
                }, 1800);
            } catch (error) {
                setShortcutState(shortcut.id, {
                    status: "error",
                    message: (error as Error)?.message ?? "Shortcut failed.",
                });
            }
        },
        [resetShortcutState, setShortcutState]
    );

    const useCaseShortcuts = React.useMemo<UseCaseShortcut[]>(
        () => [
            {
                id: "manualSave",
                title: "Save now",
                category: "Logistics",
                description: "Push the current manuscript body immediately.",
                run: async () => {
                    if (!activeTextDocument) {
                        throw new Error(
                            "Select a chapter or scrap note first."
                        );
                    }
                    await flushAutosave();
                },
            },
            {
                id: "reloadWorkspace",
                title: "Reload workspace",
                category: "Project",
                description: "Hydrate chapters, notes, and world data again.",
                run: async () => {
                    await reloadActiveProject();
                },
            },
            {
                id: "exportManuscript",
                title: "Export Manuscript",
                category: "Project",
                description: "Export the project to PDF, DOCX, or EPUB.",
                run: async () => {
                    if (!projectId) {
                        throw new Error("No active project.");
                    }
                    setIsExportDialogOpen(true);
                },
            },
            {
                id: "createChapter",
                title: "New chapter",
                category: "Manuscript",
                description: "Append a fresh chapter to the binder.",
                run: async () => {
                    await createChapterEntry();
                },
            },
            {
                id: "createScrapNote",
                title: "New scrap note",
                category: "Manuscript",
                description: "Capture a quick note.",
                run: async () => {
                    await createScrapNoteEntry();
                },
            },
            {
                id: "createCharacter",
                title: "New character",
                category: "World",
                description: "Spin up a blank character profile.",
                run: async () => {
                    await createCharacterEntry();
                },
            },
            {
                id: "analyzeChapter",
                title: "Analyze Chapter",
                category: "Analysis",
                description: "Get AI feedback on the current chapter.",
                run: async () => {
                    if (
                        !activeTextDocument ||
                        activeTextDocument.kind !== "chapter"
                    ) {
                        throw new Error("Select a chapter first.");
                    }
                    const response = await rendererApi.analysis.analyzeText({
                        projectId,
                        content: activeTextDocument.data.content,
                        instruction:
                            "Provide a brief critique of the pacing and tone.",
                    });
                    alert(response.analysis);
                },
            },
            {
                id: "quickChat",
                title: "Quick Chat",
                category: "Analysis",
                description: "Ask a question about your story.",
                run: async () => {
                    const question = window.prompt(
                        "What would you like to ask?"
                    );
                    if (!question) return;

                    const response = await rendererApi.analysis.generalChat({
                        projectId,
                        prompt: question,
                    });
                    alert(response.reply);
                },
            },
            {
                id: "moveChapter",
                title: "Move Chapter",
                category: "Manuscript",
                description: "Reorder the current chapter.",
                run: async () => {
                    if (
                        !activeTextDocument ||
                        activeTextDocument.kind !== "chapter"
                    ) {
                        throw new Error("Select a chapter first.");
                    }
                    const currentOrder = activeTextDocument.data.order + 1;
                    const input = window.prompt(
                        `Move "${activeTextDocument.data.title}" to position:`,
                        currentOrder.toString()
                    );
                    if (!input) return;
                    const targetIndex = parseInt(input, 10) - 1;
                    if (isNaN(targetIndex) || targetIndex < 0) {
                        throw new Error("Invalid position.");
                    }

                    await rendererApi.manuscript.moveChapter({
                        projectId,
                        chapterId: activeTextDocument.data.id,
                        targetIndex,
                    });
                    await reloadActiveProject();
                },
            },
            {
                id: "globalFind",
                title: "Find in Project",
                category: "Manuscript",
                description: "Search across all chapters.",
                run: async () => {
                    const term = window.prompt("Search for:");
                    if (!term) return;

                    const response = await rendererApi.manuscript.globalFind({
                        projectId,
                        term,
                    });

                    const summary = response.results
                        .map(
                            (r) =>
                                `- ${r.chapterTitle}: ${r.occurrences} matches`
                        )
                        .join("\n");

                    alert(
                        `Found ${response.totalOccurrences} matches:\n\n${summary}`
                    );
                },
            },
            {
                id: "globalReplace",
                title: "Replace in Project",
                category: "Manuscript",
                description: "Find and replace across all chapters.",
                run: async () => {
                    const find = window.prompt("Find:");
                    if (!find) return;
                    const replace = window.prompt(`Replace "${find}" with:`);
                    if (replace === null) return;

                    if (
                        !window.confirm(
                            `Are you sure you want to replace "${find}" with "${replace}" across the entire project? This cannot be undone.`
                        )
                    ) {
                        return;
                    }

                    const response =
                        await rendererApi.manuscript.globalFindAndReplace({
                            projectId,
                            find,
                            replace,
                        });

                    alert(`Replaced ${response.replacements} occurrences.`);
                    await reloadActiveProject();
                },
            },
            {
                id: "projectSettings",
                title: "Project Settings",
                category: "Logistics",
                description: "Rename the project.",
                run: async () => {
                    const newTitle = window.prompt(
                        "New project title:",
                        activeProjectName
                    );
                    if (!newTitle) return;

                    await rendererApi.logistics.saveProjectSettings({
                        projectId,
                        title: newTitle,
                    });
                    await reloadActiveProject();
                },
            },
            {
                id: "userSettings",
                title: "User Settings",
                category: "Logistics",
                description: "Update user preferences.",
                run: async () => {
                    const theme = window.prompt(
                        "Enter theme (light/dark):",
                        "dark"
                    );
                    if (!theme) return;

                    const currentUser = useAppStore.getState().user;
                    if (!currentUser) {
                        throw new Error("Not logged in.");
                    }

                    await rendererApi.logistics.saveUserSettings({
                        userId: currentUser.id,
                        preferences: { theme: theme as "light" | "dark" },
                    });
                    alert("Settings saved.");
                },
            },
            {
                id: "saveStructure",
                title: "Save Structure",
                category: "Logistics",
                description: "Force save the current chapter order.",
                run: async () => {
                    const orderedIds = chapters
                        .slice()
                        .sort((a, b) => a.order - b.order)
                        .map((c) => c.id);

                    await rendererApi.logistics.saveManuscriptStructure({
                        projectId,
                        orderedChapterIds: orderedIds,
                    });
                    alert("Structure saved.");
                },
            },
            {
                id: "deleteAsset",
                title: "Delete Asset",
                category: "Asset",
                description: "Remove an asset by ID.",
                run: async () => {
                    const assetId = window.prompt("Enter Asset ID:");
                    if (!assetId) return;
                    const kind = window.prompt(
                        "Enter Asset Kind (image/bgm/playlist):"
                    );
                    if (!kind || !["image", "bgm", "playlist"].includes(kind)) {
                        alert("Invalid asset kind.");
                        return;
                    }

                    await rendererApi.asset.deleteAsset({
                        projectId,
                        assetId,
                        kind: kind as "image" | "bgm" | "playlist",
                    });
                    alert("Asset deleted.");
                    await reloadActiveProject();
                },
            },
            {
                id: "editChapters",
                title: "Edit Manuscript",
                category: "Analysis",
                description: "Get AI feedback on a range of chapters.",
                run: async () => {
                    const startStr = window.prompt(
                        "Start Chapter Number (1-based):"
                    );
                    if (!startStr) return;
                    const endStr = window.prompt(
                        "End Chapter Number (1-based):"
                    );
                    if (!endStr) return;

                    const startChapter = parseInt(startStr, 10) - 1;
                    const endChapter = parseInt(endStr, 10) - 1;

                    if (isNaN(startChapter) || isNaN(endChapter)) {
                        alert("Invalid chapter numbers.");
                        return;
                    }

                    const sortedChapters = chapters
                        .slice()
                        .sort((a, b) => a.order - b.order);
                    const selectedChapters = sortedChapters.slice(
                        Math.max(0, startChapter),
                        endChapter + 1
                    );

                    if (!selectedChapters.length) {
                        alert("No chapters found for that range.");
                        return;
                    }

                    const response = await rendererApi.analysis.editChapters({
                        projectId,
                        chapterIds: selectedChapters.map(
                            (chapter) => chapter.id
                        ),
                    });

                    const summary = response.comments
                        .map((comment) => {
                            const chapterIndex = selectedChapters.findIndex(
                                (chapter) => chapter.id === comment.chapterId
                            );
                            const chapterLabel =
                                chapterIndex >= 0
                                    ? `Ch ${selectedChapters[chapterIndex].order + 1}`
                                    : "Chapter";
                            return `${chapterLabel}, Words ${comment.wordNumberStart}-${comment.wordNumberEnd}: ${comment.comment}`;
                        })
                        .join("\n\n");

                    alert(`Editor Comments:\n\n${summary}`);
                },
            },
        ],
        [
            activeTextDocument,
            createChapterEntry,
            createCharacterEntry,
            createScrapNoteEntry,
            flushAutosave,
            reloadActiveProject,
        ]
    );

    const handleTextTitleBlur = async () => {
        if (!activeTextDocument || !projectId) {
            return;
        }
        const trimmed = textTitle.trim();
        if (!trimmed) {
            setTextTitle(
                activeTextDocument.kind === "chapter"
                    ? "Untitled Chapter"
                    : "Untitled Note"
            );
            return;
        }

        setTitleSaving(true);
        try {
            if (activeTextDocument.kind === "chapter") {
                await rendererApi.manuscript.renameChapter({
                    chapterId: activeTextDocument.data.id,
                    title: trimmed,
                });
                updateChapterLocally(activeTextDocument.data.id, {
                    title: trimmed,
                    updatedAt: new Date(),
                });
            } else {
                await rendererApi.manuscript.updateScrapNote({
                    scrapNoteId: activeTextDocument.data.id,
                    title: trimmed,
                });
                updateScrapNoteLocally(activeTextDocument.data.id, {
                    title: trimmed,
                    updatedAt: new Date(),
                });
            }
        } finally {
            setTitleSaving(false);
        }
    };

    const handleCharacterSubmit = React.useCallback(
        async (values: CharacterEditorValues) => {
            if (!activeCharacter || !projectId) {
                throw new Error("Select a character before saving.");
            }

            const payload = {
                name: values.name,
                race: values.race,
                age: values.age ? Number(values.age) : null,
                description: values.description,
                traits: listFromMultiline(values.traits),
                goals: listFromMultiline(values.goals),
                secrets: listFromMultiline(values.secrets),
                tags: listFromMultiline(values.tags),
                currentLocationId: values.currentLocationId || null,
                backgroundLocationId: values.backgroundLocationId || null,
                organizationId: values.organizationId || null,
            };

            // Optimistic update
            const originalCharacter = { ...activeCharacter };
            updateCharacterLocally(activeCharacter.id, {
                ...payload,
                updatedAt: new Date(),
            });

            try {
                await rendererApi.logistics.saveCharacterInfo({
                    characterId: activeCharacter.id,
                    payload,
                });
            } catch (error) {
                // Revert on failure
                updateCharacterLocally(activeCharacter.id, originalCharacter);
                await reloadActiveProject();
                throw error;
            }
        },
        [
            activeCharacter,
            projectId,
            updateCharacterLocally,
            reloadActiveProject,
        ]
    );

    const handleLocationSubmit = React.useCallback(
        async (values: LocationEditorValues) => {
            if (!activeLocation || !projectId) {
                throw new Error("Select a location before saving.");
            }

            const payload = {
                name: values.name,
                description: values.description,
                culture: values.culture,
                history: values.history,
                conflicts: listFromMultiline(values.conflicts),
                tags: listFromMultiline(values.tags),
            };

            // Optimistic update
            const originalLocation = { ...activeLocation };
            updateLocationLocally(activeLocation.id, {
                ...payload,
                updatedAt: new Date(),
            });

            try {
                await rendererApi.logistics.saveLocationInfo({
                    locationId: activeLocation.id,
                    payload,
                });
            } catch (error) {
                // Revert on failure
                updateLocationLocally(activeLocation.id, originalLocation);
                await reloadActiveProject();
                throw error;
            }
        },
        [activeLocation, projectId, updateLocationLocally, reloadActiveProject]
    );

    const handleOrganizationSubmit = React.useCallback(
        async (values: OrganizationEditorValues) => {
            if (!activeOrganization || !projectId) {
                throw new Error("Select an organization before saving.");
            }

            const payload = {
                name: values.name,
                description: values.description,
                mission: values.mission,
                tags: listFromMultiline(values.tags),
                locationIds: values.locationIds,
            };

            // Optimistic update
            const originalOrganization = { ...activeOrganization };
            updateOrganizationLocally(activeOrganization.id, {
                ...payload,
                updatedAt: new Date(),
            });

            try {
                await rendererApi.logistics.saveOrganizationInfo({
                    organizationId: activeOrganization.id,
                    payload,
                });
            } catch (error) {
                // Revert on failure
                updateOrganizationLocally(
                    activeOrganization.id,
                    originalOrganization
                );
                await reloadActiveProject();
                throw error;
            }
        },
        [
            activeOrganization,
            projectId,
            updateOrganizationLocally,
            reloadActiveProject,
        ]
    );

    const makeImageHandlers = (
        subject: WorkspaceDocumentRef | null,
        subjectType: "character" | "location" | "organization"
    ) => {
        if (!subject || !projectId) {
            return {
                generate: async () => {
                    throw new Error("Select a document first.");
                },
                import: async () => {
                    throw new Error("Select a document first.");
                },
            };
        }

        const generate = async () => {
            if (subjectType === "character") {
                await rendererApi.generation.generateCharacterImage({
                    projectId,
                    characterId: subject.id,
                });
            } else if (subjectType === "location") {
                await rendererApi.generation.generateLocationImage({
                    projectId,
                    locationId: subject.id,
                });
            } else {
                await rendererApi.generation.generateOrganizationImage({
                    projectId,
                    organizationId: subject.id,
                });
            }
            await reloadActiveProject();
        };

        const handleImport = async (file: File) => {
            const buffer = await file.arrayBuffer();
            const extension = file.name.split(".").pop();
            await rendererApi.asset.importAsset({
                projectId,
                payload: {
                    kind: "image",
                    subjectType,
                    subjectId: subject.id,
                    fileData: buffer,
                    extension,
                },
            });
            await reloadActiveProject();
        };

        return { generate, import: handleImport };
    };

    const makeGenerationHandlers = (
        subject: WorkspaceDocumentRef | null,
        subjectType: "character" | "location" | "organization"
    ) => {
        if (!subject || !projectId) {
            return {
                generateSong: async () => {
                    throw new Error("Select a document first.");
                },
                generatePlaylist: async () => {
                    throw new Error("Select a document first.");
                },
            };
        }

        const generateSong = async () => {
            if (subjectType === "character") {
                await rendererApi.generation.generateCharacterSong({
                    projectId,
                    characterId: subject.id,
                });
            } else if (subjectType === "location") {
                await rendererApi.generation.generateLocationSong({
                    projectId,
                    locationId: subject.id,
                });
            } else {
                await rendererApi.generation.generateOrganizationSong({
                    projectId,
                    organizationId: subject.id,
                });
            }
            await reloadActiveProject();
        };

        const generatePlaylist = async () => {
            if (subjectType === "character") {
                await rendererApi.generation.generateCharacterPlaylist({
                    projectId,
                    characterId: subject.id,
                });
            } else if (subjectType === "location") {
                await rendererApi.generation.generateLocationPlaylist({
                    projectId,
                    locationId: subject.id,
                });
            } else {
                await rendererApi.generation.generateOrganizationPlaylist({
                    projectId,
                    organizationId: subject.id,
                });
            }
            await reloadActiveProject();
        };

        return { generateSong, generatePlaylist };
    };

    const makeAudioImportHandlers = (
        subject: WorkspaceDocumentRef | null,
        subjectType: "character" | "location" | "organization"
    ) => {
        if (!subject || !projectId) {
            return {
                importSong: async () => {
                    throw new Error("Select a document first.");
                },
                importPlaylist: async () => {
                    throw new Error("Select a document first.");
                },
            };
        }

        const importSong = async (file: File) => {
            const buffer = await file.arrayBuffer();
            const extension = file.name.split(".").pop();
            await rendererApi.asset.importAsset({
                projectId,
                payload: {
                    kind: "bgm",
                    subjectType,
                    subjectId: subject.id,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Imported",
                    fileData: buffer,
                    extension,
                },
            });
            await reloadActiveProject();
        };

        const importPlaylist = async (file: File) => {
            const text = await file.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error("Invalid playlist JSON.");
            }

            await rendererApi.asset.importAsset({
                projectId,
                payload: {
                    kind: "playlist",
                    name: data.name || file.name.replace(".json", ""),
                    description: data.description || "",
                    tracks: data.tracks || [],
                    url: "",
                    subjectType,
                    subjectId: subject.id,
                },
            });
            await reloadActiveProject();
        };

        return { importSong, importPlaylist };
    };

    const characterGallerySources = React.useMemo(
        () =>
            activeCharacter
                ? resolveStoredImageUrls(activeCharacter.galleryImageIds ?? [])
                : [],
        [activeCharacter, resolveStoredImageUrls]
    );

    const locationGallerySources = React.useMemo(
        () =>
            activeLocation
                ? resolveStoredImageUrls(activeLocation.galleryImageIds ?? [])
                : [],
        [activeLocation, resolveStoredImageUrls]
    );

    const organizationGallerySources = React.useMemo(
        () =>
            activeOrganization
                ? resolveStoredImageUrls(
                      activeOrganization.galleryImageIds ?? []
                  )
                : [],
        [activeOrganization, resolveStoredImageUrls]
    );

    const characterSongUrl = React.useMemo(
        () =>
            activeCharacter?.bgmId
                ? assets.bgms[activeCharacter.bgmId]?.url
                : undefined,
        [activeCharacter, assets.bgms]
    );

    const locationSongUrl = React.useMemo(
        () =>
            activeLocation?.bgmId
                ? assets.bgms[activeLocation.bgmId]?.url
                : undefined,
        [activeLocation, assets.bgms]
    );

    const organizationSongUrl = React.useMemo(
        () =>
            activeOrganization?.bgmId
                ? assets.bgms[activeOrganization.bgmId]?.url
                : undefined,
        [activeOrganization, assets.bgms]
    );

    const characterImageHandlers = makeImageHandlers(
        activeCharacter ? { kind: "character", id: activeCharacter.id } : null,
        "character"
    );
    const locationImageHandlers = makeImageHandlers(
        activeLocation ? { kind: "location", id: activeLocation.id } : null,
        "location"
    );
    const organizationImageHandlers = makeImageHandlers(
        activeOrganization
            ? { kind: "organization", id: activeOrganization.id }
            : null,
        "organization"
    );

    const characterGenerationHandlers = makeGenerationHandlers(
        activeCharacter ? { kind: "character", id: activeCharacter.id } : null,
        "character"
    );
    const locationGenerationHandlers = makeGenerationHandlers(
        activeLocation ? { kind: "location", id: activeLocation.id } : null,
        "location"
    );
    const organizationGenerationHandlers = makeGenerationHandlers(
        activeOrganization
            ? { kind: "organization", id: activeOrganization.id }
            : null,
        "organization"
    );

    const characterAudioImportHandlers = makeAudioImportHandlers(
        activeCharacter ? { kind: "character", id: activeCharacter.id } : null,
        "character"
    );
    const locationAudioImportHandlers = makeAudioImportHandlers(
        activeLocation ? { kind: "location", id: activeLocation.id } : null,
        "location"
    );
    const organizationAudioImportHandlers = makeAudioImportHandlers(
        activeOrganization
            ? { kind: "organization", id: activeOrganization.id }
            : null,
        "organization"
    );

    const renderEditor = () => {
        if (activeTextDocument) {
            return (
                <div className="text-editor-panel">
                    <div className="text-editor-header">
                        <div className="text-title-field">
                            <Label htmlFor="text-doc-title">Title</Label>
                            <Input
                                id="text-doc-title"
                                value={textTitle}
                                onChange={(event) =>
                                    setTextTitle(event.target.value)
                                }
                                onBlur={handleTextTitleBlur}
                                disabled={isTitleSaving}
                            />
                        </div>
                        <div
                            className={`autosave-status status-pill ${autosaveClass}`}
                        >
                            {autosaveLabel}
                        </div>
                    </div>
                    {editor ? (
                        <>
                            <div className="toolbar-card">
                                <select
                                    className="toolbar-select"
                                    aria-label="Font family"
                                    value={
                                        editor.getAttributes("textStyle")
                                            .fontFamily ?? ""
                                    }
                                    onChange={(event) => {
                                        if (!editor) {
                                            return;
                                        }
                                        const { value } = event.target;
                                        if (!value) {
                                            editor
                                                .chain()
                                                .focus()
                                                .unsetFontFamily()
                                                .run();
                                            return;
                                        }
                                        editor
                                            .chain()
                                            .focus()
                                            .setFontFamily(value)
                                            .run();
                                    }}
                                >
                                    {fontOptions.map((font) => (
                                        <option
                                            key={font.label}
                                            value={font.value}
                                        >
                                            {font.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    className="toolbar-select"
                                    aria-label="Text style"
                                    value={blockValue}
                                    onChange={(event) => {
                                        if (!editor) {
                                            return;
                                        }
                                        const value = event.target.value;
                                        const chain = editor.chain().focus();
                                        if (value === "paragraph") {
                                            chain.setParagraph().run();
                                            return;
                                        }
                                        const level = Number(
                                            value.substring(1)
                                        ) as 1 | 2 | 3;
                                        chain.setHeading({ level }).run();
                                    }}
                                >
                                    <option value="paragraph">Paragraph</option>
                                    <option value="h1">Heading 1</option>
                                    <option value="h2">Heading 2</option>
                                    <option value="h3">Heading 3</option>
                                </select>
                                <div className="toolbar-divider" />
                                <ToolbarButton
                                    label="B"
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleBold()
                                            .run()
                                    }
                                    isActive={editor.isActive("bold")}
                                />
                                <ToolbarButton
                                    label="I"
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleItalic()
                                            .run()
                                    }
                                    isActive={editor.isActive("italic")}
                                />
                                <ToolbarButton
                                    label="U"
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleUnderline()
                                            .run()
                                    }
                                    isActive={editor.isActive("underline")}
                                />
                                <ToolbarButton
                                    label="S"
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleStrike()
                                            .run()
                                    }
                                    isActive={editor.isActive("strike")}
                                />
                                <ToolbarButton
                                    label="Code"
                                    onClick={() =>
                                        editor
                                            .chain()
                                            .focus()
                                            .toggleCode()
                                            .run()
                                    }
                                    isActive={editor.isActive("code")}
                                />
                                <div className="toolbar-divider" />
                                {(
                                    [
                                        "left",
                                        "center",
                                        "right",
                                        "justify",
                                    ] as const
                                ).map((align) => (
                                    <ToolbarButton
                                        key={align}
                                        label={align[0].toUpperCase()}
                                        onClick={() =>
                                            editor
                                                .chain()
                                                .focus()
                                                .setTextAlign(align)
                                                .run()
                                        }
                                        isActive={editor.isActive({
                                            textAlign: align,
                                        })}
                                    />
                                ))}
                                <div className="toolbar-divider" />
                                <ToolbarButton
                                    label="Link"
                                    onClick={openLinkDialog}
                                    isActive={editor.isActive("link")}
                                />
                                <ToolbarButton
                                    label="Unlink"
                                    onClick={() =>
                                        editor.chain().focus().unsetLink().run()
                                    }
                                    disabled={!editor.isActive("link")}
                                />
                                <input
                                    type="color"
                                    className="toolbar-color"
                                    aria-label="Text color"
                                    value={
                                        editor.getAttributes("textStyle")
                                            .color ?? "#f6f7fb"
                                    }
                                    onChange={(event) =>
                                        editor
                                            .chain()
                                            .focus()
                                            .setColor(event.target.value)
                                            .run()
                                    }
                                />
                                <ToolbarButton
                                    label="Clear"
                                    onClick={clearFormatting}
                                />
                            </div>
                            <div className="editor-surface">
                                <EditorContent editor={editor} />
                                <div className="footer-hint">
                                    <span>Ctrl + B</span>
                                    <span>Ctrl + I</span>
                                    <span>Ctrl + K</span>
                                    <span>Cmd + Shift + P for palette</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="binder-empty">
                            Editor is still starting. Sit tight.
                        </p>
                    )}
                </div>
            );
        }

        if (activeCharacter) {
            return (
                <CharacterEditor
                    character={activeCharacter}
                    locations={locations}
                    organizations={organizations}
                    gallerySources={characterGallerySources}
                    songUrl={characterSongUrl}
                    onSubmit={handleCharacterSubmit}
                    onGeneratePortrait={characterImageHandlers.generate}
                    onImportPortrait={characterImageHandlers.import}
                    onGenerateSong={characterGenerationHandlers.generateSong}
                    onImportSong={characterAudioImportHandlers.importSong}
                    onGeneratePlaylist={
                        characterGenerationHandlers.generatePlaylist
                    }
                    onImportPlaylist={
                        characterAudioImportHandlers.importPlaylist
                    }
                />
            );
        }

        if (activeLocation) {
            return (
                <LocationEditor
                    location={activeLocation}
                    gallerySources={locationGallerySources}
                    songUrl={locationSongUrl}
                    onSubmit={handleLocationSubmit}
                    onGeneratePortrait={locationImageHandlers.generate}
                    onImportPortrait={locationImageHandlers.import}
                    onGenerateSong={locationGenerationHandlers.generateSong}
                    onImportSong={locationAudioImportHandlers.importSong}
                    onGeneratePlaylist={
                        locationGenerationHandlers.generatePlaylist
                    }
                    onImportPlaylist={
                        locationAudioImportHandlers.importPlaylist
                    }
                />
            );
        }

        if (activeOrganization) {
            return (
                <OrganizationEditor
                    organization={activeOrganization}
                    locations={locations}
                    gallerySources={organizationGallerySources}
                    songUrl={organizationSongUrl}
                    onSubmit={handleOrganizationSubmit}
                    onGeneratePortrait={organizationImageHandlers.generate}
                    onImportPortrait={organizationImageHandlers.import}
                    onGenerateSong={organizationGenerationHandlers.generateSong}
                    onImportSong={organizationAudioImportHandlers.importSong}
                    onGeneratePlaylist={
                        organizationGenerationHandlers.generatePlaylist
                    }
                    onImportPlaylist={
                        organizationAudioImportHandlers.importPlaylist
                    }
                />
            );
        }

        return (
            <div className="empty-editor">
                <p>Select something from the binder to begin editing.</p>
            </div>
        );
    };

    return (
        <>
            <section className="workspace-grid">
                <DocumentBinder
                    chapters={chapters}
                    scrapNotes={scrapNotes}
                    characters={characters}
                    locations={locations}
                    organizations={organizations}
                    activeDocument={activeDocument}
                    onSelect={setActiveDocument}
                    onCreateChapter={() => createChapterEntry()}
                    onCreateScrapNote={() => createScrapNoteEntry()}
                    onCreateCharacter={() => createCharacterEntry()}
                    onCreateLocation={() => createLocationEntry()}
                    onCreateOrganization={() => createOrganizationEntry()}
                    onDeleteChapter={(id) => deleteChapter(id)}
                    onDeleteScrapNote={(id) => deleteScrapNote(id)}
                    onDeleteCharacter={(id) => deleteCharacter(id)}
                    onDeleteLocation={(id) => deleteLocation(id)}
                    onDeleteOrganization={(id) => deleteOrganization(id)}
                    onReorderChapters={(newOrder) => reorderChapters(newOrder)}
                />
                <section className="workspace-main">
                    <div className="workspace-header">
                        <div>
                            <p className="panel-label">Active project</p>
                            <h2>{activeProjectName || "Workspace"}</h2>
                        </div>
                        <div className="workspace-header-actions">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => returnToProjects()}
                            >
                                Switch project
                            </Button>
                        </div>
                    </div>
                    <div className="workspace-columns">
                        <div className="workspace-editor">{renderEditor()}</div>
                        <aside className="usecase-panel">
                            <div>
                                <p className="panel-label">Use case hub</p>
                                <h2>Launch a workflow</h2>
                                <p className="panel-subtitle">
                                    Quick shortcuts into the most common Inkline
                                    use cases.
                                </p>
                            </div>
                            <div className="usecase-grid">
                                {useCaseShortcuts.map((shortcut) => {
                                    const state =
                                        shortcutStates[shortcut.id]?.status ??
                                        "idle";
                                    const errorMessage =
                                        shortcutStates[shortcut.id]?.message;
                                    return (
                                        <div
                                            key={shortcut.id}
                                            className="usecase-card"
                                        >
                                            <div className="usecase-meta">
                                                <span className="usecase-category">
                                                    {shortcut.category}
                                                </span>
                                                <h3>{shortcut.title}</h3>
                                                <p>{shortcut.description}</p>
                                            </div>
                                            <Button
                                                type="button"
                                                className={
                                                    state === "running"
                                                        ? "is-loading"
                                                        : undefined
                                                }
                                                onClick={() =>
                                                    runShortcut(shortcut).catch(
                                                        () => {
                                                            /* handled in runShortcut */
                                                        }
                                                    )
                                                }
                                                disabled={state === "running"}
                                            >
                                                {state === "running"
                                                    ? "Running…"
                                                    : state === "success"
                                                      ? "Done"
                                                      : "Run"}
                                            </Button>
                                            {state === "error" &&
                                            errorMessage ? (
                                                <span className="card-hint is-error">
                                                    {errorMessage}
                                                </span>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </aside>
                    </div>
                    {autosaveError ? (
                        <div className="autosave-error">{autosaveError}</div>
                    ) : null}
                </section>
            </section>
            <LinkDialog
                open={isLinkDialogOpen}
                initialUrl={pendingLinkUrl}
                onOpenChange={setLinkDialogOpen}
                onSubmit={handleLinkSubmit}
            />
            <ExportDialog
                open={isExportDialogOpen}
                onOpenChange={setIsExportDialogOpen}
                onExport={async (format, path) => {
                    if (!projectId) return;
                    await rendererApi.project.exportManuscript({
                        projectId,
                        format,
                        destinationPath: path,
                    });
                    alert("Export complete!");
                }}
            />
            {generationProgress && (
                <div className="generation-progress-toast">
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        Generating {generationProgress.type}...
                    </div>
                    <div className="generation-progress-bar">
                        <div
                            className="generation-progress-fill"
                            style={{ width: `${generationProgress.progress}%` }}
                        />
                    </div>
                    <div
                        style={{
                            fontSize: "0.8rem",
                            opacity: 0.7,
                            textAlign: "right",
                        }}
                    >
                        {generationProgress.progress}%
                    </div>
                </div>
            )}
        </>
    );
};
