import React from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";

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
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, GripVerticalIcon, PlusIcon } from "../ui/Icons";
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
};

type BinderItem = {
    id: string;
    label: string;
    meta?: string;
    kind: WorkspaceDocumentKind;
};

type BinderSection = {
    title: string;
    kind: WorkspaceDocumentKind;
    items: BinderItem[];
    onCreate: () => void;
    onDelete: (id: string) => void;
};

const normalizeLabel = (value: string, fallback: string): string => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : fallback;
};

const sortAlphabetically = <T extends { label: string }>(items: T[]): T[] =>
    [...items].sort((a, b) => a.label.localeCompare(b.label));

const SortableBinderItem = ({
    item,
    isActive,
    onSelect,
    onDelete,
}: {
    item: BinderItem;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const setDraggedDocument = useAppStore((state) => state.setDraggedDocument);
    const renameDocument = useAppStore((state) => state.renameDocument);

    const [isRenaming, setIsRenaming] = React.useState(false);
    const [renameValue, setRenameValue] = React.useState(item.label);
    const inputRef = React.useRef<HTMLInputElement>(null);

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

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : undefined,
        opacity: isDragging ? 0.5 : 1,
        display: "flex",
        alignItems: "center",
    };

    const handleDragStart = (e: React.DragEvent) => {
        // Set data for FlexLayout to recognize
        e.dataTransfer.setData("text/plain", item.label);
        e.dataTransfer.effectAllowed = "copy";
        
        // Set global state for WorkspaceLayout to read
        setDraggedDocument({
            id: item.id,
            kind: item.kind,
            title: item.label,
        });
    };

    const handleDragEnd = () => {
        setDraggedDocument(null);
    };

    return (
        <li ref={setNodeRef} style={style}>
            <button
                type="button"
                className="binder-item-drag-handle"
                style={{
                    cursor: "grab",
                    background: "transparent",
                    border: "none",
                    padding: "0 4px",
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                }}
                {...attributes}
                {...listeners}
                aria-label="Reorder"
            >
                <GripVerticalIcon size={14} />
            </button>
            {isRenaming ? (
                <div className="binder-item" style={{ cursor: "text", paddingRight: "8px" }}>
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
                            margin: "-1px -5px", // Negative margin to expand slightly beyond text area
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
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(true);
                        setRenameValue(item.label);
                    }}
                    draggable={true}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    style={{ flex: 1, textAlign: "left" }}
                >
                    <span className="binder-item-label">{item.label}</span>
                    {item.meta ? (
                        <span className="binder-item-meta">{item.meta}</span>
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
}) => {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set());

    const toggleSection = (title: string) => {
        const newCollapsed = new Set(collapsedSections);
        if (newCollapsed.has(title)) {
            newCollapsed.delete(title);
        } else {
            newCollapsed.add(title);
        }
        setCollapsedSections(newCollapsed);
    };

    const handleDragEnd = (event: DragEndEvent, sectionKind: WorkspaceDocumentKind) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            let items: { id: string }[] = [];
            let reorderFunc: ((newOrder: string[]) => void) | null = null;

            switch (sectionKind) {
                case "chapter":
                    items = chapters;
                    reorderFunc = onReorderChapters;
                    break;
                case "scrapNote":
                    items = scrapNotes;
                    reorderFunc = onReorderScrapNotes;
                    break;
                case "character":
                    items = characters;
                    reorderFunc = onReorderCharacters;
                    break;
                case "location":
                    items = locations;
                    reorderFunc = onReorderLocations;
                    break;
                case "organization":
                    items = organizations;
                    reorderFunc = onReorderOrganizations;
                    break;
            }

            if (reorderFunc) {
                const oldIndex = items.findIndex((c) => c.id === active.id);
                const newIndex = items.findIndex((c) => c.id === over?.id);

                if (oldIndex !== -1 && newIndex !== -1) {
                    const newOrder = arrayMove(items, oldIndex, newIndex).map(
                        (c) => c.id
                    );
                    reorderFunc(newOrder);
                }
            }
        }
    };

    const chapterItems: BinderItem[] = chapters
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((chapter, index) => ({
            id: chapter.id,
            label: normalizeLabel(chapter.title, `Chapter ${index + 1}`),
            meta: `Chapter ${chapter.order + 1}`,
            kind: "chapter",
        }));

    const scrapNoteItems: BinderItem[] = scrapNotes
        .map((note) => ({
            id: note.id,
            label: normalizeLabel(note.title, "Untitled Note"),
            meta: note.isPinned ? "Pinned" : undefined,
            kind: "scrapNote",
        }));

    const characterItems: BinderItem[] = characters.map((character) => ({
            id: character.id,
            label: normalizeLabel(character.name, "Untitled Character"),
            meta: character.race ? character.race : undefined,
            kind: "character",
        }));

    const locationItems: BinderItem[] = locations.map((location) => ({
            id: location.id,
            label: normalizeLabel(location.name, "Untitled Location"),
            meta: location.tags[0],
            kind: "location",
        }));

    const organizationItems: BinderItem[] = organizations.map((organization) => ({
            id: organization.id,
            label: normalizeLabel(organization.name, "Untitled Organization"),
            meta: organization.locationIds.length
                ? `${organization.locationIds.length} locations`
                : undefined,
            kind: "organization",
        }));


    const sections: BinderSection[] = [
        {
            title: "Chapters",
            kind: "chapter",
            items: chapterItems,
            onCreate: onCreateChapter,
            onDelete: onDeleteChapter,
        },
        {
            title: "Scrap Notes",
            kind: "scrapNote",
            items: scrapNoteItems,
            onCreate: onCreateScrapNote,
            onDelete: onDeleteScrapNote,
        },
        {
            title: "Characters",
            kind: "character",
            items: characterItems,
            onCreate: onCreateCharacter,
            onDelete: onDeleteCharacter,
        },
        {
            title: "Locations",
            kind: "location",
            items: locationItems,
            onCreate: onCreateLocation,
            onDelete: onDeleteLocation,
        },
        {
            title: "Organizations",
            kind: "organization",
            items: organizationItems,
            onCreate: onCreateOrganization,
            onDelete: onDeleteOrganization,
        },
    ];

    return (
        <aside className="binder-panel">
            <div className="binder-header">
                <div className="panel-label-container">
                    <p className="panel-label">EXPLORER</p>
                    <div className="panel-actions">
                        <Button variant="icon" onClick={onToggleCollapse}>
                            <ChevronLeftIcon />
                        </Button>
                    </div>
                </div>
            </div>
            <div className="binder-sections">
                {sections.map((section) => {
                    const isCollapsed = collapsedSections.has(section.title);
                    return (
                        <div className="binder-section" key={section.title}>
                            <div className="binder-section-header" onClick={() => toggleSection(section.title)}>
                                <div className="binder-section-title-row">
                                    <span className="binder-section-icon">
                                        {isCollapsed ? <ChevronRightIcon size={10} /> : <ChevronDownIcon size={10} />}
                                    </span>
                                    <span className="section-title">{section.title.toUpperCase()}</span>
                                </div>
                                <div className="binder-section-actions">
                                     <button 
                                        className="binder-icon-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            section.onCreate();
                                        }}
                                        title={`New ${section.kind}`}
                                     >
                                        <PlusIcon size={14} />
                                     </button>
                                </div>
                            </div>
                            {!isCollapsed && (
                                <div className="binder-section-content">
                                    {section.items.length ? (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(e) => handleDragEnd(e, section.kind)}
                                            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                                        >
                                            <SortableContext
                                                items={section.items.map((i) => i.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <ul className="binder-list">
                                                    {section.items.map((item) => {
                                                        const isActive =
                                                            activeDocument?.kind ===
                                                                item.kind &&
                                                            activeDocument.id ===
                                                                item.id;
                                                        return (
                                                            <SortableBinderItem
                                                                key={item.id}
                                                                item={item}
                                                                isActive={isActive}
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
                                                                        section.onDelete(
                                                                            item.id
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </ul>
                                            </SortableContext>
                                        </DndContext>
                                    ) : (
                                        <p className="binder-empty">
                                            Empty
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};
