import React from "react";

import { useAppStore } from "../state/appStore";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { ConnectedDocumentBinder } from "../components/layout/ConnectedDocumentBinder";
import { ChatPanel } from "../components/workspace/ChatPanel";
import { WorkspaceFooter } from "../components/layout/WorkspaceFooter";
import { ConflictResolutionDialog } from "../components/dialogs/ConflictResolutionDialog";
import type { WorkspaceDocumentKind } from "../types";

export const WorkspaceView: React.FC = () => {
    const { isBinderOpen, isChatOpen } = useAppStore();
    const activeDocument = useAppStore((state) => state.activeDocument);
    const closeProject = useAppStore((state) => state.closeProject);
    const deleteChapter = useAppStore((state) => state.deleteChapter);
    const deleteScrapNote = useAppStore((state) => state.deleteScrapNote);
    const deleteCharacter = useAppStore((state) => state.deleteCharacter);
    const deleteLocation = useAppStore((state) => state.deleteLocation);
    const deleteOrganization = useAppStore((state) => state.deleteOrganization);
    const setRenamingDocument = useAppStore(
        (state) => state.setRenamingDocument
    );

    React.useEffect(() => {
        const removeListener = window.ui.onContextMenuCommand((payload) => {
            const { command, data } = payload;
            if (command === "close-project") {
                closeProject();
            } else if (command === "delete") {
                if (
                    confirm(
                        `Are you sure you want to delete this ${data.kind}?`
                    )
                ) {
                    if (data.kind === "chapter") {
                        deleteChapter(data.id);
                    } else if (data.kind === "scrapNote") {
                        deleteScrapNote(data.id);
                    } else if (data.kind === "character") {
                        deleteCharacter(data.id);
                    } else if (data.kind === "location") {
                        deleteLocation(data.id);
                    } else if (data.kind === "organization") {
                        deleteOrganization(data.id);
                    }
                }
            } else if (command === "rename") {
                setRenamingDocument({ kind: data.kind, id: data.id });
            }
        });
        return () => {
            removeListener();
        };
    }, [
        closeProject,
        deleteChapter,
        deleteScrapNote,
        deleteCharacter,
        deleteLocation,
        deleteOrganization,
        setRenamingDocument,
    ]);

    const [binderActiveKind, setBinderActiveKind] =
        React.useState<WorkspaceDocumentKind>(
            activeDocument?.kind ?? "chapter"
        );

    const [isPeeking, setIsPeeking] = React.useState(false);
    const peekTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const [binderWidthState, setBinderWidthState] = React.useState(260);
    const [isResizingBinder, setIsResizingBinder] = React.useState(false);

    const [chatWidthState, setChatWidthState] = React.useState(320);
    const [isResizingChat, setIsResizingChat] = React.useState(false);

    const startResizingBinder = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingBinder(true);
    }, []);

    const stopResizingBinder = React.useCallback(() => {
        setIsResizingBinder(false);
    }, []);

    const startResizingChat = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizingChat(true);
    }, []);

    const stopResizingChat = React.useCallback(() => {
        setIsResizingChat(false);
    }, []);

    const resizeBinder = React.useCallback(
        (e: MouseEvent) => {
            if (isResizingBinder) {
                const newWidth = e.clientX;
                if (newWidth > 150 && newWidth < 600) {
                    setBinderWidthState(newWidth);
                }
            }
        },
        [isResizingBinder]
    );

    const resizeChat = React.useCallback(
        (e: MouseEvent) => {
            if (isResizingChat) {
                const newWidth = window.innerWidth - e.clientX;
                if (newWidth > 250 && newWidth < 800) {
                    setChatWidthState(newWidth);
                }
            }
        },
        [isResizingChat]
    );

    React.useEffect(() => {
        if (isResizingBinder) {
            window.addEventListener("mousemove", resizeBinder);
            window.addEventListener("mouseup", stopResizingBinder);
        } else {
            window.removeEventListener("mousemove", resizeBinder);
            window.removeEventListener("mouseup", stopResizingBinder);
        }
        return () => {
            window.removeEventListener("mousemove", resizeBinder);
            window.removeEventListener("mouseup", stopResizingBinder);
        };
    }, [isResizingBinder, resizeBinder, stopResizingBinder]);

    React.useEffect(() => {
        if (isResizingChat) {
            window.addEventListener("mousemove", resizeChat);
            window.addEventListener("mouseup", stopResizingChat);
        } else {
            window.removeEventListener("mousemove", resizeChat);
            window.removeEventListener("mouseup", stopResizingChat);
        }
        return () => {
            window.removeEventListener("mousemove", resizeChat);
            window.removeEventListener("mouseup", stopResizingChat);
        };
    }, [isResizingChat, resizeChat, stopResizingChat]);

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

    const containerClass = isBinderOpen
        ? "workspace-binder-container is-open"
        : "workspace-binder-container is-closed";

    const chatContainerClass = isChatOpen
        ? "workspace-chat-container is-open"
        : "workspace-chat-container is-closed";

    React.useEffect(() => {
        if (!activeDocument) {
            return;
        }
        if (activeDocument.kind !== binderActiveKind) {
            setBinderActiveKind(activeDocument.kind);
        }
    }, [activeDocument]);

    const binderWidth = isBinderOpen ? binderWidthState : 12;
    const chatWidth = isChatOpen ? chatWidthState : 0;

    return (
        <div
            className="workspace-view"
            style={
                {
                    "--workspace-binder-width": `${binderWidth}px`,
                    "--workspace-binder-expanded-width": `${binderWidthState}px`,
                    "--workspace-chat-width": `${chatWidth}px`,
                } as React.CSSProperties
            }
        >
            <div className="workspace-container">
                <div
                    className={containerClass}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {isBinderOpen ? (
                        <>
                            <ConnectedDocumentBinder
                                activeKind={binderActiveKind}
                                onActiveKindChange={setBinderActiveKind}
                                showTabbar={false}
                            />
                            <div
                                className="workspace-binder-resizer"
                                onMouseDown={startResizingBinder}
                                style={{
                                    position: "absolute",
                                    right: -4,
                                    top: 0,
                                    bottom: 0,
                                    width: 8,
                                    cursor: "col-resize",
                                    zIndex: 100,
                                }}
                            />
                        </>
                    ) : (
                        <>
                            <div className="binder-peek-strip" />
                            <div
                                className={`binder-peek-overlay ${isPeeking ? "is-visible" : ""}`}
                            >
                                <div className="binder-content">
                                    <ConnectedDocumentBinder
                                        activeKind={binderActiveKind}
                                        onActiveKindChange={setBinderActiveKind}
                                        showTabbar={true}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="workspace-main-content">
                    <WorkspaceLayout />
                </div>
                <div className={chatContainerClass}>
                    {isChatOpen && (
                        <>
                            <div
                                className="workspace-binder-resizer"
                                onMouseDown={startResizingChat}
                                style={{
                                    position: "absolute",
                                    left: -4,
                                    top: 0,
                                    bottom: 0,
                                    width: 8,
                                    cursor: "col-resize",
                                    zIndex: 100,
                                }}
                            />
                            <ChatPanel />
                        </>
                    )}
                </div>
            </div>

            <WorkspaceFooter
                binderActiveKind={binderActiveKind}
                onBinderActiveKindChange={setBinderActiveKind}
                isBinderOpen={isBinderOpen}
            />

            <ConflictResolutionDialog />
        </div>
    );
};
