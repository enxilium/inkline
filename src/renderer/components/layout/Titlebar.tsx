import React from "react";

import { InklineLogo } from "../ui/InklineLogo";
import {
    BinderChapterIcon,
    BinderOrganizationIcon,
    BinderScrapNoteIcon,
    MessageSquareFilledIcon,
    MessageSquareIcon,
    MapIcon,
    PanelLeftIcon,
    PanelLeftOutlineIcon,
    PenLineIcon,
    PersonIcon,
    SearchIcon,
    SettingsIcon,
} from "../ui/Icons";
import { useAppStore } from "../../state/appStore";
import { TitlebarMenuBar } from "./TitlebarMenuBar";

import type { GlobalFindResult } from "../../state/globalSearchTypes";

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
        setActiveDocument,
        workspaceViewMode,
        setWorkspaceViewMode,
    } = useAppStore();

    const [searchTerm, setSearchTerm] = React.useState("");
    const [isSearchFocused, setIsSearchFocused] = React.useState(false);

    const [searchResults, setSearchResults] = React.useState<
        GlobalFindResult[]
    >([]);
    const [isSearching, setIsSearching] = React.useState(false);

    const latestSearchIdRef = React.useRef(0);

    React.useEffect(() => {
        if (stage !== "workspace") {
            return;
        }

        if (!isSearchFocused) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        const term = searchTerm.trim();
        if (!term) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        const mySearchId = ++latestSearchIdRef.current;
        setIsSearching(true);

        const handle = window.setTimeout(() => {
            globalFind({ projectId, term })
                .then((result) => {
                    if (latestSearchIdRef.current !== mySearchId) {
                        return;
                    }
                    setSearchResults(result.results);
                })
                .catch(() => {
                    if (latestSearchIdRef.current !== mySearchId) {
                        return;
                    }
                    setSearchResults([]);
                })
                .finally(() => {
                    if (latestSearchIdRef.current !== mySearchId) {
                        return;
                    }
                    setIsSearching(false);
                });
        }, 120);

        return () => {
            window.clearTimeout(handle);
        };
    }, [globalFind, isSearchFocused, projectId, searchTerm, stage]);

    const getIconForKind = (kind: GlobalFindResult["kind"]) => {
        switch (kind) {
            case "chapter":
                return <BinderChapterIcon size={14} />;
            case "scrapNote":
                return <BinderScrapNoteIcon size={14} />;
            case "character":
                return <PersonIcon size={14} />;
            case "location":
                return <MapIcon size={14} />;
            case "organization":
                return <BinderOrganizationIcon size={14} />;
        }
    };

    const openResult = (result: GlobalFindResult) => {
        setActiveDocument({ kind: result.kind, id: result.documentId });
        setSearchResults([]);
        setSearchTerm("");
        setIsSearchFocused(false);
    };

    return (
        <div className="titlebar">
            <div className="titlebar-content">
                <div className="titlebar-left">
                    <div className="titlebar-logo" aria-hidden="true">
                        <InklineLogo />
                    </div>
                    {stage === "workspace" ? <TitlebarMenuBar /> : null}
                </div>

                {stage === "workspace" ? (
                    <div className="titlebar-center">
                        <form
                            className="titlebar-search titlebar-no-drag"
                            onSubmit={(event) => {
                                event.preventDefault();
                            }}
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
                                    setSearchResults([]);
                                }}
                                placeholder={
                                    isSearchFocused
                                        ? "Search for terms..."
                                        : activeProjectName
                                }
                                aria-label="Search"
                            />

                            {isSearchFocused && searchTerm.trim() ? (
                                <div
                                    className="titlebar-search-dropdown titlebar-no-drag"
                                    role="listbox"
                                    // Keep focus on the input so blur doesn't close before click.
                                    onMouseDown={(e) => e.preventDefault()}
                                >
                                    {isSearching ? (
                                        <div className="titlebar-search-empty">
                                            Searching...
                                        </div>
                                    ) : searchResults.length ? (
                                        <ul className="titlebar-search-results">
                                            {searchResults.map((result) => {
                                                const s = result.snippet;
                                                return (
                                                    <li
                                                        key={`${result.kind}:${result.documentId}`}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="titlebar-search-result"
                                                            onClick={() =>
                                                                openResult(
                                                                    result
                                                                )
                                                            }
                                                        >
                                                            <div className="titlebar-search-snippet">
                                                                <span className="titlebar-search-snippet-text">
                                                                    {s.leadingEllipsis ? (
                                                                        <span className="titlebar-search-ellipsis">
                                                                            …
                                                                        </span>
                                                                    ) : null}
                                                                    <span>
                                                                        {
                                                                            s.before
                                                                        }
                                                                    </span>
                                                                    <span className="titlebar-search-match">
                                                                        {
                                                                            s.match
                                                                        }
                                                                    </span>
                                                                    <span>
                                                                        {
                                                                            s.after
                                                                        }
                                                                    </span>
                                                                    {s.trailingEllipsis ? (
                                                                        <span className="titlebar-search-ellipsis">
                                                                            …
                                                                        </span>
                                                                    ) : null}
                                                                </span>
                                                            </div>

                                                            <div className="titlebar-search-file">
                                                                <span
                                                                    className="titlebar-search-file-icon"
                                                                    aria-hidden="true"
                                                                >
                                                                    {getIconForKind(
                                                                        result.kind
                                                                    )}
                                                                </span>
                                                                <span className="titlebar-search-file-label">
                                                                    {
                                                                        result.title
                                                                    }
                                                                </span>
                                                            </div>
                                                        </button>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    ) : (
                                        <div className="titlebar-search-empty">
                                            No matches.
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </form>
                    </div>
                ) : stage === "projectSelect" ? (
                    <div className="titlebar-center">
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
                            {/* Hide binder toggle when in timeline view */}
                            {workspaceViewMode === "manuscript" && (
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
                            )}
                            <button
                                type="button"
                                className="titlebar-action-icon"
                                onClick={() =>
                                    setWorkspaceViewMode(
                                        workspaceViewMode === "manuscript"
                                            ? "timeline"
                                            : "manuscript"
                                    )
                                }
                                aria-label="Toggle View"
                                title={
                                    workspaceViewMode === "manuscript"
                                        ? "Switch to Timeline"
                                        : "Switch to Manuscript"
                                }
                            >
                                {workspaceViewMode === "manuscript" ? (
                                    <MapIcon size={16} />
                                ) : (
                                    <PenLineIcon size={16} />
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
                            {/* Hide chat toggle when in timeline view */}
                            {workspaceViewMode === "manuscript" && (
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
                            )}
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
        </div>
    );
};
