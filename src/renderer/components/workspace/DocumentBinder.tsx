import React from "react";

import type {
    WorkspaceChapter,
    WorkspaceCharacter,
    WorkspaceDocumentKind,
    WorkspaceDocumentRef,
    WorkspaceLocation,
    WorkspaceOrganization,
    WorkspaceScrapNote,
} from "../../types";
import { Button } from "../ui/Button";
import {
    BinderChapterIcon,
    BinderOrganizationIcon,
    BinderScrapNoteIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MapIcon,
    MessageSquareFilledIcon,
    PersonIcon,
    PlusIcon,
} from "../ui/Icons";
import { useAppStore } from "../../state/appStore";

export type DocumentBinderProps = {
    chapters: WorkspaceChapter[];
    scrapNotes: WorkspaceScrapNote[];
    characters: WorkspaceCharacter[];
    locations: WorkspaceLocation[];
    rootLocationIds?: string[];
    organizations: WorkspaceOrganization[];
    activeDocument: WorkspaceDocumentRef | null;
    onSelect: (selection: WorkspaceDocumentRef) => void;
    onCreateChapter: () => void;
    onCreateScrapNote: () => void;
    onCreateCharacter: () => void;
    onCreateLocation: () => void;
    onCreateOrganization: () => void;
    onDeleteChapter: (id: string) => void;
    onDeleteScrapNote: (id: string) => void;
    onDeleteCharacter: (id: string) => void;
    onDeleteLocation: (id: string) => void;
    onDeleteOrganization: (id: string) => void;
    onReorderChapters: (newOrder: string[]) => void;
    onReorderScrapNotes: (newOrder: string[]) => void;
    onReorderCharacters: (newOrder: string[]) => void;
    onReorderLocations: (newOrder: string[]) => void;
    onMoveLocation: (params: {
        locationId: string;
        targetLocationId: string;
        dropMode: "before" | "inside" | "after";
    }) => void;
    onReorderOrganizations: (newOrder: string[]) => void;
    onToggleCollapse?: () => void;
    /** Used to choose the correct icon for the toggle button (collapse vs expand/pin-open). */
    isBinderOpen?: boolean;

    /** Optional external control for which section is active. */
    activeKind?: WorkspaceDocumentKind;
    onActiveKindChange?: (kind: WorkspaceDocumentKind) => void;
    /** When false, the bottom section tabbar is not rendered. */
    showTabbar?: boolean;
};

type BinderItem = {
    id: string;
    label: string;
    prefix?: string;
    kind: WorkspaceDocumentKind;
    hasPendingEdits?: boolean;
};

type BinderSection = {
    title: string;
    kind: WorkspaceDocumentKind;
    items: BinderItem[];
    onCreate: () => void;
    onDelete: (id: string) => void;
    onReorder: (newOrder: string[]) => void;
};

const normalizeLabel = (value: string, fallback: string): string => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
};

const DraggableBinderItem = ({
    item,
    isActive,
    isDragging,
    dropPosition,
    onSelect,
    onDelete,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    indentLevel = 0,
    hasChildren = false,
    isCollapsed = false,
    onToggleCollapse,
    disableDrag = false,
    animateReveal = false,
    animateCollapse = false,
    isDragActive = false,
}: {
    item: BinderItem;
    isActive: boolean;
    isDragging?: boolean;
    dropPosition?: "top" | "middle" | "bottom" | "none";
    onSelect: () => void;
    onDelete: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    indentLevel?: number;
    hasChildren?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    disableDrag?: boolean;
    animateReveal?: boolean;
    animateCollapse?: boolean;
    isDragActive?: boolean;
}) => {
    const renameDocument = useAppStore((state) => state.renameDocument);
    const renamingDocument = useAppStore((state) => state.renamingDocument);
    const setRenamingDocument = useAppStore(
        (state) => state.setRenamingDocument,
    );

    const [isRenaming, setIsRenaming] = React.useState(false);
    const [renameValue, setRenameValue] = React.useState(item.label);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (
            renamingDocument?.id === item.id &&
            renamingDocument?.kind === item.kind
        ) {
            setIsRenaming(true);
            setRenamingDocument(null);
        }
    }, [renamingDocument, item.id, item.kind, setRenamingDocument]);

    React.useEffect(() => {
        if (isRenaming && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isRenaming]);

    const handleRenameSubmit = async () => {
        if (renameValue.trim() && renameValue !== item.label) {
            await renameDocument(item.kind, item.id, renameValue.trim());
        } else {
            setRenameValue(item.label);
        }
        setIsRenaming(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleRenameSubmit();
        } else if (e.key === "Escape") {
            setRenameValue(item.label);
            setIsRenaming(false);
        }
    };

    return (
        <li
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={
                (isActive ? "is-active" : "") +
                (isDragActive ? " is-drag-active" : "")
            }
            style={{
                opacity: isDragging ? 0.4 : 1,
                borderTop:
                    dropPosition === "top"
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                borderBottom:
                    dropPosition === "bottom"
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                background:
                    dropPosition === "middle"
                        ? "var(--accent-transparent)"
                        : "transparent",
            }}
        >
            {isRenaming ? (
                <div
                    className="binder-item binder-item-renaming"
                    style={{ cursor: "text" }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        className="binder-item-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{
                            width: "100%",
                            background: "transparent",
                            color: "var(--text)",
                            border: "1px solid var(--accent)",
                            borderRadius: "2px",
                            padding: "0 4px",
                            margin: "-1px 0",
                            fontSize: "inherit",
                            fontFamily: "inherit",
                            outline: "none",
                        }}
                    />
                </div>
            ) : (
                <button
                    type="button"
                    className={
                        "binder-item" +
                        (isActive ? " is-active" : "") +
                        (animateReveal ? " binder-item-reveal" : "") +
                        (animateCollapse ? " binder-item-collapse" : "")
                    }
                    onClick={onSelect}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.ui.showContextMenu("binder_chapter", {
                            id: item.id,
                            kind: item.kind,
                        });
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(true);
                        setRenameValue(item.label);
                    }}
                    draggable={!disableDrag}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    data-kind={item.kind}
                    style={{
                        flex: 1,
                        textAlign: "left",
                        paddingLeft: `${8 + indentLevel * 16}px`,
                    }}
                >
                    {hasChildren ? (
                        <span
                            role="button"
                            aria-label={
                                isCollapsed
                                    ? "Expand location"
                                    : "Collapse location"
                            }
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onToggleCollapse?.();
                            }}
                            style={{
                                display: "inline-flex",
                                marginRight: "4px",
                                width: "14px",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {isCollapsed ? (
                                <ChevronRightIcon size={12} />
                            ) : (
                                <ChevronDownIcon size={12} />
                            )}
                        </span>
                    ) : (
                        <span
                            aria-hidden
                            style={{ display: "inline-block", width: "14px" }}
                        />
                    )}
                    {item.prefix ? (
                        <span className="binder-item-prefix">
                            {item.prefix}
                        </span>
                    ) : null}
                    <span className="binder-item-label">{item.label}</span>
                    {item.kind === "chapter" && item.hasPendingEdits ? (
                        <span className="binder-item-pending" aria-hidden>
                            <MessageSquareFilledIcon size={14} />
                        </span>
                    ) : null}
                </button>
            )}
            <button
                type="button"
                className="binder-item-delete"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                }}
                aria-label="Delete"
                onPointerDown={(e) => e.stopPropagation()}
            >
                ×
            </button>
        </li>
    );
};

export const DocumentBinder: React.FC<DocumentBinderProps> = ({
    chapters,
    scrapNotes,
    characters,
    locations,
    rootLocationIds = [],
    organizations,
    activeDocument,
    onSelect,
    onCreateChapter,
    onCreateScrapNote,
    onCreateCharacter,
    onCreateLocation,
    onCreateOrganization,
    onDeleteChapter,
    onDeleteScrapNote,
    onDeleteCharacter,
    onDeleteLocation,
    onDeleteOrganization,
    onReorderChapters,
    onReorderScrapNotes,
    onReorderCharacters,
    onReorderLocations,
    onMoveLocation,
    onReorderOrganizations,
    onToggleCollapse,
    isBinderOpen,
    activeKind: controlledActiveKind,
    onActiveKindChange,
    showTabbar = true,
}) => {
    const pendingEditsByChapterId = useAppStore(
        (state) => state.pendingEditsByChapterId,
    );
    const setDraggedDocument = useAppStore((state) => state.setDraggedDocument);

    const [uncontrolledActiveKind, setUncontrolledActiveKind] =
        React.useState<WorkspaceDocumentKind>(
            activeDocument?.kind ?? "chapter",
        );

    const activeKind = controlledActiveKind ?? uncontrolledActiveKind;

    // Native Drag & Drop State
    const [draggedId, setDraggedId] = React.useState<string | null>(null);
    const [dragOverId, setDragOverId] = React.useState<string | null>(null);
    const [dragOverZone, setDragOverZone] = React.useState<
        "top" | "middle" | "bottom" | null
    >(null);
    const [collapsedLocationIds, setCollapsedLocationIds] = React.useState<
        Record<string, boolean>
    >({});
    const autoExpandTimerRef = React.useRef<number | null>(null);
    const autoExpandTargetRef = React.useRef<string | null>(null);
    const revealTimerRef = React.useRef<number | null>(null);
    const collapseTimersRef = React.useRef<Record<string, number>>({});
    const [revealedLocationIds, setRevealedLocationIds] = React.useState<
        Record<string, boolean>
    >({});
    const [collapsingLocationIds, setCollapsingLocationIds] = React.useState<
        Record<string, boolean>
    >({});

    const clearAutoExpandTimer = React.useCallback(() => {
        if (autoExpandTimerRef.current !== null) {
            window.clearTimeout(autoExpandTimerRef.current);
            autoExpandTimerRef.current = null;
        }
        autoExpandTargetRef.current = null;
    }, []);

    const clearRevealTimer = React.useCallback(() => {
        if (revealTimerRef.current !== null) {
            window.clearTimeout(revealTimerRef.current);
            revealTimerRef.current = null;
        }
    }, []);

    const clearCollapseTimer = React.useCallback((parentId: string) => {
        const timerId = collapseTimersRef.current[parentId];
        if (timerId !== undefined) {
            window.clearTimeout(timerId);
            delete collapseTimersRef.current[parentId];
        }
    }, []);

    const clearCollapseTimers = React.useCallback(() => {
        Object.values(collapseTimersRef.current).forEach((timerId) => {
            window.clearTimeout(timerId);
        });
        collapseTimersRef.current = {};
    }, []);

    React.useEffect(() => {
        return () => {
            clearAutoExpandTimer();
            clearRevealTimer();
            clearCollapseTimers();
        };
    }, [clearAutoExpandTimer, clearRevealTimer, clearCollapseTimers]);

    const getRevealedLocationIds = React.useCallback(
        (
            parentId: string,
            collapsedMap: Record<string, boolean>,
        ): Record<string, boolean> => {
            const locationsById = new Map(
                locations.map((location) => [location.id, location]),
            );
            const revealed: Record<string, boolean> = {};
            const visit = (locationId: string) => {
                const location = locationsById.get(locationId);
                if (!location) {
                    return;
                }

                location.sublocationIds.forEach((childId) => {
                    if (!locationsById.has(childId)) {
                        return;
                    }
                    revealed[childId] = true;

                    if (!collapsedMap[childId]) {
                        visit(childId);
                    }
                });
            };

            visit(parentId);
            return revealed;
        },
        [locations],
    );

    const handleSelectKind = (kind: WorkspaceDocumentKind) => {
        if (onActiveKindChange) {
            onActiveKindChange(kind);
            return;
        }
        setUncontrolledActiveKind(kind);
    };

    const getIconForKind = (kind: WorkspaceDocumentKind) => {
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

    const chapterItems: BinderItem[] = chapters
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((chapter) => ({
            id: chapter.id,
            label: normalizeLabel(chapter.title, "Untitled Chapter"),
            prefix: String(chapter.order + 1),
            kind: "chapter",
            hasPendingEdits:
                (pendingEditsByChapterId[chapter.id]?.comments?.length ?? 0) >
                    0 ||
                (pendingEditsByChapterId[chapter.id]?.replacements?.length ??
                    0) > 0,
        }));

    const scrapNoteItems: BinderItem[] = scrapNotes.map((note) => ({
        id: note.id,
        label: normalizeLabel(note.title, "Untitled Note"),
        kind: "scrapNote",
    }));

    const characterItems: BinderItem[] = characters.map((character) => ({
        id: character.id,
        label: normalizeLabel(character.name, "Untitled Character"),
        kind: "character",
    }));

    const locationItems: BinderItem[] = locations.map((location) => ({
        id: location.id,
        label: normalizeLabel(location.name, "Untitled Location"),
        kind: "location",
    }));

    const locationRows = React.useMemo(() => {
        const locationsById = new Map(
            locations.map((location) => [location.id, location]),
        );
        const childIds = new Set<string>();
        locations.forEach((location) => {
            location.sublocationIds.forEach((childId) => {
                childIds.add(childId);
            });
        });

        const roots = rootLocationIds
            .filter((id) => locationsById.has(id))
            .concat(
                locations
                    .map((location) => location.id)
                    .filter(
                        (id) =>
                            !rootLocationIds.includes(id) && !childIds.has(id),
                    ),
            );

        const rows: Array<
            BinderItem & { depth: number; hasChildren: boolean }
        > = [];
        const visited = new Set<string>();

        const visit = (locationId: string, depth: number) => {
            if (visited.has(locationId)) {
                return;
            }

            visited.add(locationId);
            const location = locationsById.get(locationId);
            if (!location) {
                return;
            }

            const hasChildren = location.sublocationIds.some((childId) =>
                locationsById.has(childId),
            );

            rows.push({
                id: location.id,
                label: normalizeLabel(location.name, "Untitled Location"),
                kind: "location",
                depth,
                hasChildren,
            });

            if (collapsedLocationIds[location.id]) {
                return;
            }

            location.sublocationIds.forEach((childId) =>
                visit(childId, depth + 1),
            );
        };

        roots.forEach((rootId) => visit(rootId, 0));

        locations.forEach((location) => {
            if (!visited.has(location.id) && !childIds.has(location.id)) {
                visit(location.id, 0);
            }
        });

        return rows;
    }, [collapsedLocationIds, locations, rootLocationIds]);

    const getLocationDescendantCount = React.useCallback(
        (locationId: string): number => {
            const locationsById = new Map(
                locations.map((location) => [location.id, location]),
            );
            let count = 0;
            const stack = [locationId];
            const visited = new Set<string>();

            while (stack.length > 0) {
                const currentId = stack.pop();
                if (!currentId || visited.has(currentId)) {
                    continue;
                }
                visited.add(currentId);

                if (currentId !== locationId) {
                    count += 1;
                }

                const current = locationsById.get(currentId);
                if (!current) {
                    continue;
                }

                current.sublocationIds.forEach((childId) =>
                    stack.push(childId),
                );
            }

            return count;
        },
        [locations],
    );

    const organizationItems: BinderItem[] = organizations.map(
        (organization) => ({
            id: organization.id,
            label: normalizeLabel(organization.name, "Untitled Organization"),
            kind: "organization",
        }),
    );

    const sections: BinderSection[] = [
        {
            title: "Chapters",
            kind: "chapter",
            items: chapterItems,
            onCreate: onCreateChapter,
            onDelete: onDeleteChapter,
            onReorder: onReorderChapters,
        },
        {
            title: "Scrap Notes",
            kind: "scrapNote",
            items: scrapNoteItems,
            onCreate: onCreateScrapNote,
            onDelete: onDeleteScrapNote,
            onReorder: onReorderScrapNotes,
        },
        {
            title: "Characters",
            kind: "character",
            items: characterItems,
            onCreate: onCreateCharacter,
            onDelete: onDeleteCharacter,
            onReorder: onReorderCharacters,
        },
        {
            title: "Locations",
            kind: "location",
            items: locationItems,
            onCreate: onCreateLocation,
            onDelete: onDeleteLocation,
            onReorder: onReorderLocations,
        },
        {
            title: "Organizations",
            kind: "organization",
            items: organizationItems,
            onCreate: onCreateOrganization,
            onDelete: onDeleteOrganization,
            onReorder: onReorderOrganizations,
        },
    ];

    const activeSection =
        sections.find((section) => section.kind === activeKind) ?? sections[0];

    const handleDragStart = (e: React.DragEvent, item: BinderItem) => {
        setDraggedId(item.id);
        setDraggedDocument({
            id: item.id,
            kind: item.kind,
            title: item.label,
        });
        e.dataTransfer.setData(
            "application/x-inkline-document-ref",
            JSON.stringify({
                id: item.id,
                kind: item.kind,
                title: item.label,
            }),
        );
        e.dataTransfer.effectAllowed = "copyMove";
    };

    const resetDragState = React.useCallback(() => {
        setDraggedId(null);
        setDragOverId(null);
        setDragOverZone(null);
        setDraggedDocument(null);
        clearAutoExpandTimer();
    }, [clearAutoExpandTimer, setDraggedDocument]);

    const handleDragOver = (e: React.DragEvent, item: BinderItem) => {
        e.preventDefault(); // Allow drop
        if (draggedId && draggedId !== item.id) {
            setDragOverId(item.id);

            if (activeSection.kind === "location") {
                const element = e.currentTarget as HTMLElement;
                const rect = element.getBoundingClientRect();
                const ratio = (e.clientY - rect.top) / Math.max(rect.height, 1);
                const hoveredLocation = locations.find(
                    (location) => location.id === item.id,
                );
                const hasChildren =
                    (hoveredLocation?.sublocationIds.length ?? 0) > 0;

                // Favor "inside" for location nesting by shrinking edge zones.
                if (ratio < 0.15) {
                    setDragOverZone("top");
                    clearAutoExpandTimer();
                } else if (ratio > 0.85) {
                    setDragOverZone("bottom");
                    clearAutoExpandTimer();
                } else {
                    setDragOverZone("middle");

                    if (hasChildren && collapsedLocationIds[item.id]) {
                        if (autoExpandTargetRef.current !== item.id) {
                            clearAutoExpandTimer();
                            autoExpandTargetRef.current = item.id;
                            autoExpandTimerRef.current = window.setTimeout(
                                () => {
                                    setCollapsedLocationIds((current) => {
                                        if (!current[item.id]) {
                                            return current;
                                        }
                                        return {
                                            ...current,
                                            [item.id]: false,
                                        };
                                    });
                                    clearAutoExpandTimer();
                                },
                                550,
                            );
                        }
                    } else {
                        clearAutoExpandTimer();
                    }
                }
                return;
            }

            setDragOverZone(null);
            clearAutoExpandTimer();
        }
    };

    const handleDrop = (e: React.DragEvent, targetItem: BinderItem) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedId && draggedId !== targetItem.id) {
            if (activeSection.kind === "location") {
                const dropMode =
                    dragOverZone === "top"
                        ? "before"
                        : dragOverZone === "bottom"
                          ? "after"
                          : "inside";

                onMoveLocation({
                    locationId: draggedId,
                    targetLocationId: targetItem.id,
                    dropMode,
                });

                resetDragState();
                return;
            }

            const oldIndex = activeSection.items.findIndex(
                (i) => i.id === draggedId,
            );
            const newIndex = activeSection.items.findIndex(
                (i) => i.id === targetItem.id,
            );

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = [...activeSection.items];
                const [moved] = newItems.splice(oldIndex, 1);
                newItems.splice(newIndex, 0, moved);
                activeSection.onReorder(newItems.map((i) => i.id));
            }
        }

        resetDragState();
    };

    const handleDragEnd = () => {
        resetDragState();
    };

    React.useEffect(() => {
        const handleGlobalReset = () => {
            resetDragState();
        };

        window.addEventListener("dragend", handleGlobalReset);
        window.addEventListener("drop", handleGlobalReset);
        window.addEventListener("blur", handleGlobalReset);
        window.addEventListener("mouseup", handleGlobalReset);

        return () => {
            window.removeEventListener("dragend", handleGlobalReset);
            window.removeEventListener("drop", handleGlobalReset);
            window.removeEventListener("blur", handleGlobalReset);
            window.removeEventListener("mouseup", handleGlobalReset);
        };
    }, [resetDragState]);

    const renderedItems =
        activeSection.kind === "location" ? locationRows : activeSection.items;

    const toggleIcon =
        (isBinderOpen ?? true) ? <ChevronLeftIcon /> : <ChevronRightIcon />;

    return (
        <aside
            className="binder-panel"
            onContextMenu={(e) => {
                e.preventDefault();
                window.ui.showContextMenu("binder_project");
            }}
        >
            <div className="binder-header">
                <div className="panel-label-container">
                    <p className="panel-label">EXPLORER</p>
                    <div className="panel-actions">
                        <Button variant="icon" onClick={onToggleCollapse}>
                            {toggleIcon}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="binder-active-header">
                <div className="binder-active-title">
                    <span className="binder-active-icon">
                        {getIconForKind(activeSection.kind)}
                    </span>
                    <span className="section-title">
                        {activeSection.title.toUpperCase()}
                    </span>
                </div>
                <Button
                    variant="icon"
                    className="binder-create"
                    onClick={activeSection.onCreate}
                    title={`New ${activeSection.title}`}
                >
                    <PlusIcon size={14} />
                </Button>
            </div>

            <div className="binder-sections binder-scroll-area">
                {renderedItems.length ? (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <div
                            style={{
                                height: "10px",
                                flexShrink: 0,
                                marginBottom: "-10px",
                                zIndex: 10,
                                position: "relative",
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (
                                    draggedId &&
                                    renderedItems.length > 0 &&
                                    draggedId !== renderedItems[0].id
                                ) {
                                    setDragOverId(renderedItems[0].id);
                                    if (activeSection.kind === "location") {
                                        setDragOverZone("top");
                                    }
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (renderedItems.length > 0) {
                                    if (activeSection.kind === "location") {
                                        setDragOverZone("top");
                                    }
                                    handleDrop(e, renderedItems[0]);
                                }
                            }}
                        />
                        <ul className="binder-list">
                            {(() => {
                                const draggedIndex = renderedItems.findIndex(
                                    (i) => i.id === draggedId,
                                );
                                return renderedItems.map((item, index) => {
                                    const isActive =
                                        activeDocument?.kind === item.kind &&
                                        activeDocument.id === item.id;

                                    let dropPosition:
                                        | "middle"
                                        | "top"
                                        | "bottom"
                                        | "none" = "none";
                                    if (dragOverId === item.id && draggedId) {
                                        if (activeSection.kind === "location") {
                                            dropPosition =
                                                dragOverZone ?? "middle";
                                        } else {
                                            if (draggedIndex > index)
                                                dropPosition = "top";
                                            if (draggedIndex < index)
                                                dropPosition = "bottom";
                                        }
                                    }

                                    const locationRow =
                                        activeSection.kind === "location"
                                            ? locationRows.find(
                                                  (row) => row.id === item.id,
                                              )
                                            : undefined;

                                    return (
                                        <DraggableBinderItem
                                            key={item.id}
                                            item={item}
                                            isActive={isActive}
                                            isDragging={draggedId === item.id}
                                            dropPosition={dropPosition}
                                            onSelect={() =>
                                                onSelect({
                                                    kind: item.kind,
                                                    id: item.id,
                                                })
                                            }
                                            onDelete={() => {
                                                const descendantCount =
                                                    item.kind === "location"
                                                        ? getLocationDescendantCount(
                                                              item.id,
                                                          )
                                                        : 0;
                                                const confirmMessage =
                                                    descendantCount > 0
                                                        ? `Delete "${item.label}" and its ${descendantCount} sub-location${descendantCount === 1 ? "" : "s"}? This cannot be undone.`
                                                        : `Delete "${item.label}"?`;
                                                if (
                                                    window.confirm(
                                                        confirmMessage,
                                                    )
                                                ) {
                                                    activeSection.onDelete(
                                                        item.id,
                                                    );
                                                }
                                            }}
                                            onDragStart={(e) =>
                                                handleDragStart(e, item)
                                            }
                                            onDragOver={(e) =>
                                                handleDragOver(e, item)
                                            }
                                            onDrop={(e) => handleDrop(e, item)}
                                            onDragEnd={handleDragEnd}
                                            indentLevel={
                                                locationRow?.depth ?? 0
                                            }
                                            hasChildren={
                                                locationRow?.hasChildren ??
                                                false
                                            }
                                            isCollapsed={
                                                !!collapsedLocationIds[item.id]
                                            }
                                            onToggleCollapse={() => {
                                                setCollapsedLocationIds(
                                                    (current) => {
                                                        const isCurrentlyCollapsed =
                                                            !!current[item.id];

                                                        if (
                                                            isCurrentlyCollapsed
                                                        ) {
                                                            clearCollapseTimer(
                                                                item.id,
                                                            );

                                                            const next = {
                                                                ...current,
                                                                [item.id]: false,
                                                            };

                                                            const revealed =
                                                                getRevealedLocationIds(
                                                                    item.id,
                                                                    current,
                                                                );
                                                            setCollapsingLocationIds(
                                                                (existing) => {
                                                                    if (
                                                                        !Object.keys(
                                                                            existing,
                                                                        ).length
                                                                    ) {
                                                                        return existing;
                                                                    }

                                                                    const updated =
                                                                        {
                                                                            ...existing,
                                                                        };
                                                                    Object.keys(
                                                                        revealed,
                                                                    ).forEach(
                                                                        (
                                                                            id,
                                                                        ) => {
                                                                            delete updated[
                                                                                id
                                                                            ];
                                                                        },
                                                                    );
                                                                    return updated;
                                                                },
                                                            );
                                                            setRevealedLocationIds(
                                                                revealed,
                                                            );
                                                            clearRevealTimer();
                                                            revealTimerRef.current =
                                                                window.setTimeout(
                                                                    () => {
                                                                        setRevealedLocationIds(
                                                                            {},
                                                                        );
                                                                        clearRevealTimer();
                                                                    },
                                                                    220,
                                                                );

                                                            return next;
                                                        } else {
                                                            const collapsing =
                                                                getRevealedLocationIds(
                                                                    item.id,
                                                                    current,
                                                                );

                                                            if (
                                                                Object.keys(
                                                                    collapsing,
                                                                ).length === 0
                                                            ) {
                                                                return {
                                                                    ...current,
                                                                    [item.id]: true,
                                                                };
                                                            }

                                                            setRevealedLocationIds(
                                                                {},
                                                            );
                                                            clearRevealTimer();

                                                            setCollapsingLocationIds(
                                                                (existing) => ({
                                                                    ...existing,
                                                                    ...collapsing,
                                                                }),
                                                            );

                                                            clearCollapseTimer(
                                                                item.id,
                                                            );
                                                            collapseTimersRef.current[
                                                                item.id
                                                            ] =
                                                                window.setTimeout(
                                                                    () => {
                                                                        setCollapsedLocationIds(
                                                                            (
                                                                                latest,
                                                                            ) => ({
                                                                                ...latest,
                                                                                [item.id]: true,
                                                                            }),
                                                                        );
                                                                        setCollapsingLocationIds(
                                                                            (
                                                                                existing,
                                                                            ) => {
                                                                                const updated =
                                                                                    {
                                                                                        ...existing,
                                                                                    };
                                                                                Object.keys(
                                                                                    collapsing,
                                                                                ).forEach(
                                                                                    (
                                                                                        id,
                                                                                    ) => {
                                                                                        delete updated[
                                                                                            id
                                                                                        ];
                                                                                    },
                                                                                );
                                                                                return updated;
                                                                            },
                                                                        );
                                                                        clearCollapseTimer(
                                                                            item.id,
                                                                        );
                                                                    },
                                                                    220,
                                                                );

                                                            return current;
                                                        }
                                                    },
                                                );
                                            }}
                                            animateReveal={
                                                activeSection.kind ===
                                                    "location" &&
                                                !!revealedLocationIds[item.id]
                                            }
                                            animateCollapse={
                                                activeSection.kind ===
                                                    "location" &&
                                                !!collapsingLocationIds[item.id]
                                            }
                                            isDragActive={!!draggedId}
                                            disableDrag={false}
                                        />
                                    );
                                });
                            })()}
                        </ul>
                    </div>
                ) : (
                    <p className="binder-empty">Empty</p>
                )}
            </div>

            {showTabbar ? (
                <div className="binder-tabbar">
                    {sections.map((section) => (
                        <Button
                            key={section.kind}
                            variant="icon"
                            className={
                                "binder-tab" +
                                (section.kind === activeKind
                                    ? " is-active"
                                    : "")
                            }
                            onClick={() => handleSelectKind(section.kind)}
                            title={section.title}
                        >
                            {getIconForKind(section.kind)}
                        </Button>
                    ))}
                </div>
            ) : null}
        </aside>
    );
};
