import React from "react";

import { useAppStore } from "../state/appStore";
import { WorkspaceLayout } from "../components/layout/WorkspaceLayout";
import { ConnectedDocumentBinder } from "../components/layout/ConnectedDocumentBinder";
import { ChatPanel } from "../components/workspace/ChatPanel";
import { WorkspaceFooter } from "../components/layout/WorkspaceFooter";

export const WorkspaceView: React.FC = () => {
    const { isBinderOpen, isChatOpen } = useAppStore();

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

    return (
        <div className="workspace-view">
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
                            <div
                                className={`binder-peek-overlay ${isPeeking ? "is-visible" : ""}`}
                            >
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

            <WorkspaceFooter />
        </div>
    );
};
