import React from "react";

import { InklineLogo } from "../ui/InklineLogo";
import {
    MessageSquareFilledIcon,
    MessageSquareIcon,
    PanelLeftIcon,
    PanelLeftOutlineIcon,
    SearchIcon,
    SettingsIcon,
} from "../ui/Icons";
import { useAppStore } from "../../state/appStore";
import { TitlebarMenuBar } from "./TitlebarMenuBar";

export const Titlebar: React.FC = () => {
    const {
        stage,
        projectId,
        activeProjectName,
        isBinderOpen,
        toggleBinder,
        isChatOpen,
        toggleChat,
        openSettings,
        globalFind,
    } = useAppStore();

    const [searchTerm, setSearchTerm] = React.useState("");
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);

    const handleSearchSubmit = React.useCallback(
        (event: React.FormEvent) => {
            event.preventDefault();

            const term = searchTerm.trim();
            if (!term) return;

            globalFind({ projectId, term })
                .then((result) => {
                    alert(`Found ${result.totalOccurrences} occurrences.`);
                })
                .catch((error) => {
                    alert(
                        "Search failed: " +
                            ((error as Error)?.message ?? "Unknown error")
                    );
                });
        },
        [globalFind, projectId, searchTerm]
    );

    return (
        <div className="titlebar-content">
            <div className="titlebar-left">
                <div className="titlebar-logo" aria-hidden="true">
                    <InklineLogo />
                </div>
                {stage === "workspace" ? <TitlebarMenuBar /> : null}
            </div>

            {stage === "workspace" ? (
                <div className="titlebar-center titlebar-no-drag">
                    <form
                        className="titlebar-search titlebar-no-drag"
                        onSubmit={handleSearchSubmit}
                    >
                        <span
                            className="titlebar-search-icon"
                            aria-hidden="true"
                        >
                            <SearchIcon size={14} />
                        </span>
                        <input
                            className={
                                "titlebar-search-input titlebar-no-drag" +
                                (!isSearchFocused && !searchTerm
                                    ? " is-project-title"
                                    : "")
                            }
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => {
                                setIsSearchFocused(false);
                                setSearchTerm("");
                            }}
                            placeholder={
                                isSearchFocused
                                    ? "Search for terms..."
                                    : activeProjectName
                            }
                            aria-label="Search"
                        />
                    </form>
                </div>
            ) : stage === "projectSelect" ? (
                <div className="titlebar-center titlebar-no-drag">
                    <div
                        className="titlebar-center-label"
                        aria-label="Projects"
                    >
                        PROJECTS
                    </div>
                </div>
            ) : (
                <div className="titlebar-center" />
            )}

            <div className="titlebar-right">
                {stage === "workspace" ? (
                    <div className="titlebar-actions titlebar-no-drag">
                        <button
                            type="button"
                            className="titlebar-action-icon"
                            onClick={toggleBinder}
                            aria-label="Toggle Pane"
                            aria-pressed={isBinderOpen}
                            title="Toggle Pane"
                        >
                            {isBinderOpen ? (
                                <PanelLeftIcon size={18} />
                            ) : (
                                <PanelLeftOutlineIcon size={18} />
                            )}
                        </button>
                        <button
                            type="button"
                            className="titlebar-action-icon"
                            aria-label="Settings"
                            onClick={openSettings}
                            title="Settings"
                        >
                            <SettingsIcon size={16} />
                        </button>
                        <button
                            type="button"
                            className="titlebar-action-icon"
                            onClick={toggleChat}
                            aria-label="Chat"
                            aria-pressed={isChatOpen}
                            title="Chat"
                        >
                            {isChatOpen ? (
                                <MessageSquareFilledIcon size={16} />
                            ) : (
                                <MessageSquareIcon size={16} />
                            )}
                        </button>
                    </div>
                ) : stage === "projectSelect" ? (
                    <div className="titlebar-actions titlebar-no-drag">
                        <button
                            type="button"
                            className="titlebar-action-icon"
                            aria-label="Settings"
                            onClick={openSettings}
                            title="Settings"
                        >
                            <SettingsIcon size={16} />
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
