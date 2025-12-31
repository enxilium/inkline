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
}: {
    item: BinderItem;
    isActive: boolean;
    isDragging?: boolean;
    dropPosition?: "top" | "bottom" | "none";
    onSelect: () => void;
    onDelete: () => void;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
}) => {
    const renameDocument = useAppStore((state) => state.renameDocument);
    const renamingDocument = useAppStore((state) => state.renamingDocument);
    const setRenamingDocument = useAppStore(
        (state) => state.setRenamingDocument
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
            className={isActive ? "is-active" : ""}
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
                    className={"binder-item" + (isActive ? " is-active" : "")}
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
                    draggable={true}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    data-kind={item.kind}
                    style={{ flex: 1, textAlign: "left" }}
                >
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
    onReorderOrganizations,
    onToggleCollapse,
    isBinderOpen,
    activeKind: controlledActiveKind,
    onActiveKindChange,
    showTabbar = true,
}) => {
    const pendingEditsByChapterId = useAppStore(
        (state) => state.pendingEditsByChapterId
    );
    const setDraggedDocument = useAppStore((state) => state.setDraggedDocument);

    const [uncontrolledActiveKind, setUncontrolledActiveKind] =
        React.useState<WorkspaceDocumentKind>(
            activeDocument?.kind ?? "chapter"
        );

    const activeKind = controlledActiveKind ?? uncontrolledActiveKind;

    // Native Drag & Drop State
    const [draggedId, setDraggedId] = React.useState<string | null>(null);
    const [dragOverId, setDragOverId] = React.useState<string | null>(null);

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
                return <BinderChapterIcon size={16} style={{ color: "var(--text)" }} />;
            case "scrapNote":
                return <BinderScrapNoteIcon size={16} style={{ color: "var(--text)" }} />;
            case "character":
                return <PersonIcon size={16} style={{ color: "var(--text)" }} />;
            case "location":
                return <MapIcon size={16} style={{ color: "var(--text)" }} />;
            case "organization":
                return <BinderOrganizationIcon size={16} style={{ color: "var(--text)" }} />;
        }
    };

    const chapterItems: BinderItem[] = chapters
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((chapter, index) => ({
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

    const organizationItems: BinderItem[] = organizations.map(
        (organization) => ({
            id: organization.id,
            label: normalizeLabel(organization.name, "Untitled Organization"),
            kind: "organization",
        })
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
            })
        );
        e.dataTransfer.effectAllowed = "copyMove";
    };

    const handleDragOver = (e: React.DragEvent, item: BinderItem) => {
        e.preventDefault(); // Allow drop
        if (draggedId && draggedId !== item.id) {
            setDragOverId(item.id);
        }
    };

    const handleDrop = (e: React.DragEvent, targetItem: BinderItem) => {
        e.preventDefault();
        e.stopPropagation();

        if (draggedId && draggedId !== targetItem.id) {
            const oldIndex = activeSection.items.findIndex(
                (i) => i.id === draggedId
            );
            const newIndex = activeSection.items.findIndex(
                (i) => i.id === targetItem.id
            );

            if (oldIndex !== -1 && newIndex !== -1) {
                const newItems = [...activeSection.items];
                const [moved] = newItems.splice(oldIndex, 1);
                newItems.splice(newIndex, 0, moved);
                activeSection.onReorder(newItems.map((i) => i.id));
            }
        }

        setDraggedId(null);
        setDragOverId(null);
        setDraggedDocument(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
        setDraggedDocument(null);
    };

    const renderedItems = activeSection.items;

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
                    style={{ color: "var(--text)" }}
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
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (renderedItems.length > 0) {
                                    handleDrop(e, renderedItems[0]);
                                }
                            }}
                        />
                        <ul className="binder-list">
                            {(() => {
                                const draggedIndex = renderedItems.findIndex(
                                    (i) => i.id === draggedId
                                );
                                return renderedItems.map((item, index) => {
                                    const isActive =
                                        activeDocument?.kind === item.kind &&
                                        activeDocument.id === item.id;

                                    let dropPosition:
                                        | "top"
                                        | "bottom"
                                        | "none" = "none";
                                    if (dragOverId === item.id && draggedId) {
                                        if (draggedIndex > index)
                                            dropPosition = "top";
                                        if (draggedIndex < index)
                                            dropPosition = "bottom";
                                    }

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
                                                if (
                                                    window.confirm(
                                                        `Delete "${item.label}"?`
                                                    )
                                                ) {
                                                    activeSection.onDelete(
                                                        item.id
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
