import React from "react";

import { useAppStore } from "../state/appStore";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { ConnectedDocumentBinder } from "../components/layout/ConnectedDocumentBinder";
import { ChatPanel } from "../components/workspace/ChatPanel";
import { WorkspaceFooter } from "../components/layout/WorkspaceFooter";
import type { WorkspaceDocumentKind } from "../types";

export const WorkspaceView: React.FC = () => {
    const { isBinderOpen, isChatOpen } = useAppStore();
    const activeDocument = useAppStore((state) => state.activeDocument);

    const [binderActiveKind, setBinderActiveKind] =
        React.useState<WorkspaceDocumentKind>(
            activeDocument?.kind ?? "chapter"
        );

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
    }, [activeDocument, binderActiveKind]);

    const binderWidth = isBinderOpen ? 260 : 12;
    const chatWidth = isChatOpen ? 320 : 0;

    return (
        <div
            className="workspace-view"
            style={
                {
                    "--workspace-binder-width": `${binderWidth}px`,
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
                        <ConnectedDocumentBinder
                            activeKind={binderActiveKind}
                            onActiveKindChange={setBinderActiveKind}
                            showTabbar={false}
                        />
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
                                        showTabbar={false}
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
                    {isChatOpen && <ChatPanel />}
                </div>
            </div>

            <WorkspaceFooter
                binderActiveKind={binderActiveKind}
                onBinderActiveKindChange={setBinderActiveKind}
                isBinderOpen={isBinderOpen}
            />
        </div>
    );
};
