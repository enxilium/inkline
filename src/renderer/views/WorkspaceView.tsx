import React from "react";
import { Button } from "../components/ui/Button";
import { ChevronLeftIcon, PanelLeftIcon, MessageSquareIcon, DownloadIcon } from "../components/ui/Icons";

import type { UseCaseShortcut } from "../types";
import { ensureRendererApi } from "../utils/api";
import { useAppStore } from "../state/appStore";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { ConnectedDocumentBinder } from "../components/layout/ConnectedDocumentBinder";
import { ChatPanel } from "../components/workspace/ChatPanel";

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
        isBinderOpen,
        toggleBinder,
        isChatOpen,
        toggleChat,
    } = useAppStore();

    const [isPeeking, setIsPeeking] = React.useState(false);
    const peekTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (!isBinderOpen) {
            if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
            peekTimeoutRef.current = setTimeout(() => setIsPeeking(true), 150);
        }
    };

    const handleMouseLeave = () => {
        if (peekTimeoutRef.current) clearTimeout(peekTimeoutRef.current);
        setIsPeeking(false);
    };

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

    const handleExport = async () => {
        const path = window.prompt("Enter destination path (e.g. /Users/sophie/Desktop/story.pdf):");
        if (!path) return;
        
        try {
            await rendererApi.project.exportManuscript({
                projectId,
                format: "pdf", // You could also make this a dropdown selection
                destinationPath: path,
            });
            alert("Export complete!");
        } catch (error) {
            alert("Export failed: " + (error as Error).message);
        }
        };

    const containerClass = isBinderOpen
        ? "workspace-binder-container is-open"
        : "workspace-binder-container is-closed";

    const chatContainerClass = isChatOpen
        ? "workspace-chat-container is-open"
        : "workspace-chat-container is-closed";

    return (
        <div style={{ height: '94vh', display: 'flex', flexDirection: 'column' }}>
            <div className="nav-workspace">
                <div>
                    <div className="flex-row">
                        <Button variant="icon" onClick={returnToProjects}>
                            <ChevronLeftIcon />
                        </Button>
                        <div className="section-title">{activeProjectName}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="icon" onClick={handleExport}>
                        <DownloadIcon />
                    </Button>
                    <Button variant="icon" onClick={toggleBinder}>
                        <PanelLeftIcon />
                    </Button>
                    <Button variant="icon" onClick={toggleChat} className={isChatOpen ? "is-active" : ""}>
                        <MessageSquareIcon />
                    </Button>
                </div>
            </div>
            
            <div className="workspace-container">
                <div 
                    className={containerClass}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {isBinderOpen ? (
                        <ConnectedDocumentBinder />
                    ) : (
                        <>
                            <div className="binder-peek-strip" />
                            <div className={`binder-peek-overlay ${isPeeking ? "is-visible" : ""}`}>
                                <div className="binder-content">
                                    <ConnectedDocumentBinder />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="workspace-main-content">
                    <WorkspaceLayout />
                </div>
                <div className={chatContainerClass}>
                    {isChatOpen && <ChatPanel />}
                </div>
            </div>
        </div>
    );
};
