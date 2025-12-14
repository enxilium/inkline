import React from "react";

import { useAppStore } from "../../state/appStore";
import { CheckIcon, CloseIcon, RefreshCwIcon } from "../ui/Icons";
import { getTextStats } from "../../utils/textStats";

const formatInt = (value: number): string =>
    value.toLocaleString(undefined, { maximumFractionDigits: 0 });

export const WorkspaceFooter: React.FC = () => {
    const { activeDocument, chapters, autosaveStatus, autosaveError } =
        useAppStore();

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

    return (
        <div className="workspace-footer" role="contentinfo">
            <div className="workspace-footer-left">
                {shouldShowAutosave ? (
                    <div
                        className="workspace-footer-autosave"
                        title={autosaveTitle}
                    >
                        {renderAutosaveIcon()}
                    </div>
                ) : null}
            </div>

            <div className="workspace-footer-center">
                {activeChapterStats ? (
                    <div
                        className="workspace-footer-stat"
                        onMouseEnter={() => setIsHoveringCount(true)}
                        onMouseLeave={() => setIsHoveringCount(false)}
                        title={
                            isHoveringCount ? "Word count" : "Character count"
                        }
                    >
                        {isHoveringCount
                            ? `${formatInt(activeChapterStats.characterCount)} chars`
                            : `${formatInt(activeChapterStats.wordCount)} words`}
                    </div>
                ) : null}
            </div>

            <div className="workspace-footer-right">
                <div className="workspace-footer-brand">INKLINE STUDIO</div>
            </div>
        </div>
    );
};
