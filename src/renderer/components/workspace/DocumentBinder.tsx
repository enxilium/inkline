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
import {
    restrictToVerticalAxis,
    restrictToParentElement,
} from "@dnd-kit/modifiers";

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
    GripVerticalIcon,
    MapIcon,
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
};

type BinderItem = {
    id: string;
    label: string;
    prefix?: string;
    kind: WorkspaceDocumentKind;
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
        // Use a custom payload so this drag is treated as a tiling action,
        // not as plain text that can be dropped into an editor.
        e.dataTransfer.setData(
            "application/x-inkline-document-ref",
            JSON.stringify({
                id: item.id,
                kind: item.kind,
                title: item.label,
            })
        );
        // Keep a text/plain entry to satisfy some drag-and-drop consumers,
        // but avoid putting the document title here.
        e.dataTransfer.setData("text/plain", "");
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
                {...attributes}
                {...listeners}
                aria-label="Reorder"
            >
                <GripVerticalIcon size={14} />
            </button>
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
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        setIsRenaming(true);
                        setRenameValue(item.label);
                    }}
                    draggable={true}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    data-kind={item.kind}
                    style={{ flex: 1, textAlign: "left" }}
                >
                    {item.prefix ? (
                        <span className="binder-item-prefix">
                            {item.prefix}
                        </span>
                    ) : null}
                    <span className="binder-item-label">{item.label}</span>
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

    const [activeKind, setActiveKind] = React.useState<WorkspaceDocumentKind>(
        activeDocument?.kind ?? "chapter"
    );

    const handleDragEnd = (event: DragEndEvent, section: BinderSection) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        const oldIndex = section.items.findIndex((c) => c.id === active.id);
        const newIndex = section.items.findIndex((c) => c.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const newOrder = arrayMove(section.items, oldIndex, newIndex).map(
            (c) => c.id
        );
        section.onReorder(newOrder);
    };

    const handleSelectKind = (kind: WorkspaceDocumentKind) => {
        setActiveKind(kind);
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
        .map((chapter, index) => ({
            id: chapter.id,
            label: normalizeLabel(chapter.title, "Untitled Chapter"),
            prefix: String(chapter.order + 1),
            kind: "chapter",
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
                {activeSection.items.length ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(e) => handleDragEnd(e, activeSection)}
                        modifiers={[
                            restrictToVerticalAxis,
                            restrictToParentElement,
                        ]}
                    >
                        <SortableContext
                            items={activeSection.items.map((i) => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <ul className="binder-list">
                                {activeSection.items.map((item) => {
                                    const isActive =
                                        activeDocument?.kind === item.kind &&
                                        activeDocument.id === item.id;
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
                                                    activeSection.onDelete(
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
                    <p className="binder-empty">Empty</p>
                )}
            </div>

            <div className="binder-tabbar">
                {sections.map((section) => (
                    <Button
                        key={section.kind}
                        variant="icon"
                        className={
                            "binder-tab" +
                            (section.kind === activeKind ? " is-active" : "")
                        }
                        onClick={() => handleSelectKind(section.kind)}
                        title={section.title}
                    >
                        {getIconForKind(section.kind)}
                    </Button>
                ))}
            </div>
        </aside>
    );
};
