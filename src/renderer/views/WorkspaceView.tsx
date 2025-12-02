import React from "react";
import { Button } from "../components/ui/Button";
import { ChevronLeftIcon, PanelLeftIcon } from "../components/ui/Icons";

import type { UseCaseShortcut } from "../types";
import { ensureRendererApi } from "../utils/api";
import { useAppStore } from "../state/appStore";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";

const rendererApi = ensureRendererApi();

export const WorkspaceView: React.FC = () => {
    const {
        projectId,
        activeProjectName,
        chapters,
        scrapNotes,
        activeDocument,
        createChapterEntry,
        createScrapNoteEntry,
        createCharacterEntry,
        reloadActiveProject,
        returnToProjects,
        setShortcutState,
        resetShortcutState,
    } = useAppStore();

    const shortcutTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({});

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
                        !activeDocument ||
                        activeDocument.kind !== "chapter"
                    ) {
                        throw new Error("Select a chapter first.");
                    }
                    const chapter = chapters.find(c => c.id === activeDocument.id);
                    if (!chapter) throw new Error("Chapter not found.");

                    const response = await rendererApi.analysis.analyzeText({
                        projectId,
                        content: chapter.content,
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
                id: "exportManuscript",
                title: "Export Manuscript",
                category: "Project",
                description: "Export the project to a file.",
                run: async () => {
                    const path = window.prompt(
                        "Enter destination path (e.g. C:\\Users\\Name\\Desktop\\story.pdf):"
                    );
                    if (!path) return;
                    await rendererApi.project.exportManuscript({
                        projectId,
                        format: "pdf",
                        destinationPath: path,
                    });
                    alert("Export complete!");
                },
            },
        ],
        [
            activeDocument,
            chapters,
            createChapterEntry,
            createCharacterEntry,
            createScrapNoteEntry,
            reloadActiveProject,
            projectId
        ]
    );

    // TODO: Add keyboard listener for shortcuts if needed

    return (
        <div style={{ height: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="nav-workspace">
                <div>
                    <div className="flex-row">
                        <Button variant="icon" onClick={returnToProjects}>
                            <ChevronLeftIcon />
                        </Button>
                        <div className="section-title">{activeProjectName}</div>
                    </div>
                </div>
            </div>
            
            <section style={{ flex: 1, position: 'relative', width: '100%' }}>
                <WorkspaceLayout />
            </section>
        </div>
    );
};
