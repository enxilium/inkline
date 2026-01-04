import React from "react";

import { useAppStore } from "../../state/appStore";
import {
    BinderChapterIcon,
    BinderOrganizationIcon,
    BinderScrapNoteIcon,
    CheckIcon,
    CloseIcon,
    MapIcon,
    PersonIcon,
    RefreshCwIcon,
    WifiIcon,
    WifiOffIcon,
} from "../ui/Icons";
import { getTextStats } from "../../utils/textStats";
import type { WorkspaceDocumentKind } from "../../types";
import { Button } from "../ui/Button";

const formatInt = (value: number): string =>
    value.toLocaleString(undefined, { maximumFractionDigits: 0 });

export const WorkspaceFooter: React.FC<{
    binderActiveKind: WorkspaceDocumentKind;
    onBinderActiveKindChange: (kind: WorkspaceDocumentKind) => void;
    isBinderOpen: boolean;
}> = ({ binderActiveKind, onBinderActiveKindChange, isBinderOpen }) => {
    const {
        activeDocument,
        chapters,
        autosaveStatus,
        autosaveError,
        syncStatus,
        lastSyncedAt,
        workspaceViewMode,
    } = useAppStore();

    const [isHoveringCount, setIsHoveringCount] = React.useState(false);

    const activeChapter = React.useMemo(() => {
        if (!activeDocument || activeDocument.kind !== "chapter") {
            return null;
        }
        return (
            chapters.find((chapter) => chapter.id === activeDocument.id) ?? null
        );
    }, [activeDocument, chapters]);

    const activeChapterStats = React.useMemo(() => {
        if (!activeChapter) {
            return null;
        }
        return getTextStats(activeChapter.content);
    }, [activeChapter]);

    const renderAutosaveIcon = () => {
        // Condensed footer-only autosave indicator.
        switch (autosaveStatus) {
            case "saving":
            case "pending":
                return (
                    <span
                        className="workspace-footer-autosave-icon is-spinning"
                        aria-hidden="true"
                    >
                        <RefreshCwIcon size={14} />
                    </span>
                );
            case "saved":
                return (
                    <span
                        className="workspace-footer-autosave-icon is-success"
                        aria-hidden="true"
                    >
                        <CheckIcon size={14} />
                    </span>
                );
            case "error":
                return (
                    <span
                        className="workspace-footer-autosave-icon is-error"
                        aria-hidden="true"
                    >
                        <CloseIcon size={14} />
                    </span>
                );
            default:
                return (
                    <span
                        className="workspace-footer-autosave-dot"
                        aria-hidden="true"
                    />
                );
        }
    };

    const autosaveTitle = React.useMemo(() => {
        switch (autosaveStatus) {
            case "saving":
                return "Autosaving…";
            case "pending":
                return "Autosave queued";
            case "saved":
                return "Saved";
            case "error":
                return autosaveError
                    ? `Autosave failed: ${autosaveError}`
                    : "Autosave failed";
            case "disabled":
                return "Autosave disabled";
            default:
                return "Autosave idle";
        }
    }, [autosaveError, autosaveStatus]);

    const shouldShowAutosave = Boolean(activeDocument);

    const binderSections: Array<{
        kind: WorkspaceDocumentKind;
        title: string;
    }> = React.useMemo(
        () => [
            { kind: "chapter", title: "Chapters" },
            { kind: "scrapNote", title: "Scrap Notes" },
            { kind: "character", title: "Characters" },
            { kind: "location", title: "Locations" },
            { kind: "organization", title: "Organizations" },
        ],
        []
    );

    const renderBinderIcon = (kind: WorkspaceDocumentKind) => {
        switch (kind) {
            case "chapter":
                return <BinderChapterIcon size={16} />;
            case "scrapNote":
                return <BinderScrapNoteIcon size={16} />;
            case "character":
                return <PersonIcon size={16} />;
            case "location":
                return <MapIcon size={16} />;
            case "organization":
                return <BinderOrganizationIcon size={16} />;
        }
    };

    // Use simplified layout in timeline view (no binder/chat columns)
    const footerClassName =
        workspaceViewMode === "timeline"
            ? "workspace-footer workspace-footer--timeline"
            : "workspace-footer";

    return (
        <div className={footerClassName} role="contentinfo">
            {/* Only render binder column in manuscript view */}
            {workspaceViewMode === "manuscript" && (
                <div className="workspace-footer-binder">
                    {isBinderOpen ? (
                        <div className="binder-tabbar workspace-footer-binder-tabbar">
                            {binderSections.map((section) => (
                                <Button
                                    key={section.kind}
                                    variant="icon"
                                    className={
                                        "binder-tab" +
                                        (section.kind === binderActiveKind
                                            ? " is-active"
                                            : "")
                                    }
                                    onClick={() =>
                                        onBinderActiveKindChange(section.kind)
                                    }
                                    title={section.title}
                                >
                                    {renderBinderIcon(section.kind)}
                                </Button>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}

            <div className="workspace-footer-main">
                <div className="workspace-footer-left">
                    {shouldShowAutosave ? (
                        <div
                            className="workspace-footer-autosave"
                            title={autosaveTitle}
                        >
                            {renderAutosaveIcon()}
                        </div>
                    ) : null}
                    <div
                        className={`workspace-footer-connection is-${syncStatus}`}
                        title={getSyncStatusTitle(syncStatus, lastSyncedAt)}
                    >
                        {renderSyncIcon(syncStatus)}
                        <span className="workspace-footer-connection-label">
                            {getSyncStatusLabel(syncStatus)}
                        </span>
                    </div>
                </div>

                <div className="workspace-footer-center">
                    {workspaceViewMode === "timeline" ? (
                        <div
                            className="workspace-footer-stat"
                            style={{
                                color: "var(--accent)",
                                fontWeight: 500,
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            TIMELINE (experimental feature)
                        </div>
                    ) : activeChapterStats ? (
                        <div
                            className="workspace-footer-stat"
                            onMouseEnter={() => setIsHoveringCount(true)}
                            onMouseLeave={() => setIsHoveringCount(false)}
                            title={
                                isHoveringCount
                                    ? "Word count"
                                    : "Character count"
                            }
                        >
                            {isHoveringCount
                                ? `${formatInt(activeChapterStats.characterCount)} chars`
                                : `${formatInt(activeChapterStats.wordCount)} words`}
                        </div>
                    ) : null}
                </div>

                {/* In timeline view, include right section inside main for proper centering */}
                {workspaceViewMode === "timeline" && (
                    <div className="workspace-footer-right">
                        <div className="workspace-footer-brand">
                            INKLINE STUDIO
                        </div>
                    </div>
                )}
            </div>

            {/* Only render chat column in manuscript view */}
            {workspaceViewMode === "manuscript" && (
                <div className="workspace-footer-chat" aria-hidden="true" />
            )}

            {/* Right section outside main for manuscript view */}
            {workspaceViewMode === "manuscript" && (
                <div className="workspace-footer-right">
                    <div className="workspace-footer-brand">INKLINE STUDIO</div>
                </div>
            )}
        </div>
    );
};

const getSyncStatusLabel = (
    status: "online" | "offline" | "syncing"
): string => {
    switch (status) {
        case "online":
            return "Online";
        case "offline":
            return "Offline";
        case "syncing":
            return "Syncing...";
    }
};

const getSyncStatusTitle = (
    status: "online" | "offline" | "syncing",
    lastSyncedAt: string | null
): string => {
    const lastSyncStr = lastSyncedAt
        ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`
        : "";

    switch (status) {
        case "online":
            return `Online - syncing to cloud${lastSyncStr ? `\n${lastSyncStr}` : ""}`;
        case "offline":
            return "Offline - changes saved locally";
        case "syncing":
            return "Synchronizing with cloud...";
    }
};

const renderSyncIcon = (status: "online" | "offline" | "syncing") => {
    switch (status) {
        case "online":
            return <WifiIcon size={14} />;
        case "offline":
            return <WifiOffIcon size={14} />;
        case "syncing":
            return (
                <span
                    className="workspace-footer-sync-icon is-spinning"
                    aria-hidden="true"
                >
                    <RefreshCwIcon size={14} />
                </span>
            );
    }
};
