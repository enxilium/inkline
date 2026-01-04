import React, { useState, useEffect, useCallback } from "react";
import { CloseIcon } from "../ui/Icons";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { TextAreaInput } from "../ui/TextAreaInput";
import { useAppStore } from "../../state/appStore";
import { EventType } from "../../../@core/domain/entities/story/timeline/Event";
import { extractPlainText } from "../../utils/textStats";
import { ConfirmationDialog } from "../dialogs/ConfirmationDialog";
import {
    SearchableMultiSelect,
    type SelectOption,
} from "../ui/SearchableSelect";

// Helper to check if a unit is a calendar-based unit (CE/BCE)
const isCalendarUnit = (unit: string): boolean => {
    return unit === "CE" || unit === "BCE";
};

// Month options for dropdown
const MONTHS = [
    { value: "", label: "-- Select Month --" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
];

interface EventPeekPanelProps {
    event: {
        id: string;
        title: string;
        description: string;
        time: number;
        year: number;
        month: number | null;
        day: number | null;
        type: EventType;
        associatedId: string | null;
        timelineId: string;
        characterIds: string[];
        locationIds: string[];
        organizationIds: string[];
    } | null;
    isOpen: boolean;
    onClose: () => void;
    timeUnit: string;
}

// Extract plain text from TipTap JSON content for preview
const getPlainTextPreview = (content: string, maxLength = 300) => {
    const text = extractPlainText(content);
    if (text.length > maxLength) {
        return text.substring(0, maxLength).trim() + "...";
    }
    return text || "No content";
};

export const EventPeekPanel: React.FC<EventPeekPanelProps> = ({
    event,
    isOpen,
    onClose,
    timeUnit,
}) => {
    const {
        chapters,
        scrapNotes,
        characters,
        locations,
        organizations,
        setActiveDocument,
        setWorkspaceViewMode,
        deleteEvent,
        updateEvent,
    } = useAppStore();
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Local state for plain event editing
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editYear, setEditYear] = useState<string>("");
    const [editMonth, setEditMonth] = useState<string>("");
    const [editDay, setEditDay] = useState<string>("");
    const [editCharacterIds, setEditCharacterIds] = useState<string[]>([]);
    const [editLocationIds, setEditLocationIds] = useState<string[]>([]);
    const [editOrganizationIds, setEditOrganizationIds] = useState<string[]>(
        []
    );
    const [isSaving, setIsSaving] = useState(false);

    // Check if timeline uses calendar units
    const usesCalendarUnit = isCalendarUnit(timeUnit);

    // Reset local state when event changes
    useEffect(() => {
        if (event && event.type === "event") {
            setEditTitle(event.title);
            setEditDescription(event.description);
            setEditYear(String(event.year ?? event.time));
            setEditMonth(event.month !== null ? String(event.month) : "");
            setEditDay(event.day !== null ? String(event.day) : "");
            setEditCharacterIds(event.characterIds ?? []);
            setEditLocationIds(event.locationIds ?? []);
            setEditOrganizationIds(event.organizationIds ?? []);
        }
    }, [event?.id, event?.type]);

    // Auto-save handler with debounce
    const handleSave = useCallback(async () => {
        if (!event || event.type !== "event" || isSaving) return;

        const parsedYear = parseInt(editYear, 10);
        if (isNaN(parsedYear)) return;

        const parsedMonth = editMonth ? parseInt(editMonth, 10) : null;
        const parsedDay = editDay ? parseInt(editDay, 10) : null;

        setIsSaving(true);
        try {
            await updateEvent({
                eventId: event.id,
                title: editTitle,
                description: editDescription,
                year: parsedYear,
                month: usesCalendarUnit ? parsedMonth : null,
                day: usesCalendarUnit ? parsedDay : null,
                characterIds: editCharacterIds,
                locationIds: editLocationIds,
                organizationIds: editOrganizationIds,
            });
        } catch (error) {
            console.error("Failed to save event:", error);
        } finally {
            setIsSaving(false);
        }
    }, [
        event,
        editTitle,
        editDescription,
        editYear,
        editMonth,
        editDay,
        editCharacterIds,
        editLocationIds,
        editOrganizationIds,
        updateEvent,
        isSaving,
        usesCalendarUnit,
    ]);

    // Debounced auto-save effect
    useEffect(() => {
        if (!event || event.type !== "event") return;

        const timeout = setTimeout(() => {
            handleSave();
        }, 500);

        return () => clearTimeout(timeout);
    }, [
        editTitle,
        editDescription,
        editYear,
        editMonth,
        editDay,
        editCharacterIds,
        editLocationIds,
        editOrganizationIds,
    ]);

    // Options for multi-select dropdowns
    const characterOptions: SelectOption[] = characters.map((c) => ({
        id: c.id,
        label: c.name || "Unnamed Character",
    }));

    const locationOptions: SelectOption[] = locations.map((l) => ({
        id: l.id,
        label: l.name || "Unnamed Location",
    }));

    const organizationOptions: SelectOption[] = organizations.map((o) => ({
        id: o.id,
        label: o.name || "Unnamed Organization",
    }));

    if (!isOpen || !event) return null;

    const associatedItem =
        event.type === "chapter"
            ? chapters.find((c) => c.id === event.associatedId)
            : event.type === "scrap_note"
              ? scrapNotes.find((n) => n.id === event.associatedId)
              : null;

    const getTypeLabel = (type: EventType) => {
        switch (type) {
            case "chapter":
                return "Chapter";
            case "scrap_note":
                return "Scrap Note";
            case "event":
                return "Event";
            default:
                return type;
        }
    };

    const handleGoToWorkspace = () => {
        if (!event.associatedId) return;

        const kind = event.type === "chapter" ? "chapter" : "scrapNote";
        setActiveDocument({ kind, id: event.associatedId });
        setWorkspaceViewMode("manuscript");
        onClose();
    };

    const handleDeleteEvent = async () => {
        try {
            await deleteEvent({
                eventId: event.id,
                timelineId: event.timelineId,
            });
            onClose();
        } catch (error) {
            console.error("Failed to delete event:", error);
        }
    };

    // For linked events, use the associated item's title
    const displayTitle =
        (event.type === "chapter" || event.type === "scrap_note") &&
        associatedItem
            ? associatedItem.title
            : event.title;

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "320px",
                backgroundColor: "var(--surface)",
                borderRight: "1px solid var(--stroke)",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                boxShadow: "4px 0 12px rgba(0, 0, 0, 0.15)",
                animation: "slideInFromLeft 0.2s ease-out",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "1rem",
                    borderBottom: "1px solid var(--stroke)",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                    }}
                >
                    <span
                        style={{
                            fontSize: "0.7rem",
                            color: "var(--accent)",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "0.25rem",
                            backgroundColor: "var(--accent-transparent2)",
                            textTransform: "uppercase",
                            fontWeight: 600,
                        }}
                    >
                        {getTypeLabel(event.type)}
                    </span>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <CloseIcon size={16} />
                </Button>
            </div>

            {/* Content */}
            <div
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                {/* Content for linked chapter/scrap note */}
                {(event.type === "chapter" || event.type === "scrap_note") &&
                    associatedItem && (
                        <>
                            {/* Time */}
                            <div>
                                <Label>Time</Label>
                                <div
                                    style={{
                                        fontSize: "1.25rem",
                                        fontWeight: 600,
                                        color: "var(--accent)",
                                    }}
                                >
                                    {usesCalendarUnit && event.month ? (
                                        <>
                                            {MONTHS.find(
                                                (m) =>
                                                    m.value ===
                                                    String(event.month)
                                            )?.label || ""}{" "}
                                            {event.day ? `${event.day}, ` : ""}
                                            {event.year} {timeUnit}
                                        </>
                                    ) : (
                                        <>
                                            {event.year} {timeUnit}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <Label>Title</Label>
                                <div
                                    style={{
                                        fontSize: "1rem",
                                        fontWeight: 500,
                                    }}
                                >
                                    {displayTitle || "Untitled"}
                                </div>
                            </div>

                            {/* Content Preview */}
                            <div style={{ flex: 1 }}>
                                <Label>Content Preview</Label>
                                <div
                                    style={{
                                        fontSize: "0.9rem",
                                        color: "rgba(255,255,255,0.7)",
                                        lineHeight: 1.5,
                                        whiteSpace: "pre-wrap",
                                        padding: "0.75rem",
                                        backgroundColor:
                                            "var(--surface-strong)",
                                        borderRadius: "0.5rem",
                                        border: "1px solid var(--stroke)",
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                    }}
                                >
                                    {getPlainTextPreview(
                                        associatedItem.content
                                    )}
                                </div>
                            </div>

                            {/* Open Full Text Button */}
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleGoToWorkspace}
                                style={{ width: "100%" }}
                            >
                                Open Full Text →
                            </Button>
                        </>
                    )}

                {/* Editable fields for standalone events */}
                {event.type === "event" && (
                    <>
                        {/* Event Name */}
                        <div>
                            <Label htmlFor="event-title">Event Name</Label>
                            <Input
                                id="event-title"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Enter event name..."
                            />
                        </div>

                        {/* Event Date/Time */}
                        <div>
                            <Label htmlFor="event-year">
                                Year ({timeUnit})
                            </Label>
                            <Input
                                id="event-year"
                                type="number"
                                value={editYear}
                                onChange={(e) => setEditYear(e.target.value)}
                                placeholder="Enter year..."
                                min={usesCalendarUnit ? 0 : undefined}
                            />
                        </div>

                        {/* Month and Day for CE/BCE timelines */}
                        {usesCalendarUnit && (
                            <>
                                <div>
                                    <Label htmlFor="event-month">
                                        Month (optional)
                                    </Label>
                                    <select
                                        id="event-month"
                                        value={editMonth}
                                        onChange={(e) =>
                                            setEditMonth(e.target.value)
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "0.5rem",
                                            borderRadius: "0.375rem",
                                            border: "1px solid var(--stroke)",
                                            backgroundColor: "var(--surface)",
                                            color: "inherit",
                                            fontSize: "0.875rem",
                                        }}
                                    >
                                        {MONTHS.map((m) => (
                                            <option
                                                key={m.value}
                                                value={m.value}
                                            >
                                                {m.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <Label htmlFor="event-day">
                                        Day (optional)
                                    </Label>
                                    <Input
                                        id="event-day"
                                        type="number"
                                        value={editDay}
                                        onChange={(e) =>
                                            setEditDay(e.target.value)
                                        }
                                        placeholder="1-31"
                                        min={1}
                                        max={31}
                                        disabled={!editMonth}
                                    />
                                    {!editMonth && (
                                        <p
                                            style={{
                                                fontSize: "0.7rem",
                                                color: "var(--text-muted)",
                                                marginTop: "0.25rem",
                                            }}
                                        >
                                            Select a month first to specify a
                                            day.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Description */}
                        <div>
                            <Label htmlFor="event-description">
                                Description
                            </Label>
                            <TextAreaInput
                                id="event-description"
                                value={editDescription}
                                onChange={setEditDescription}
                                placeholder="Describe what happens during this event..."
                                rows={4}
                            />
                        </div>

                        {/* Involved Characters */}
                        <div>
                            <Label>Involved Characters</Label>
                            <SearchableMultiSelect
                                value={editCharacterIds}
                                options={characterOptions}
                                onChange={setEditCharacterIds}
                                placeholder="Search to add characters..."
                            />
                        </div>

                        {/* Involved Locations */}
                        <div>
                            <Label>Involved Locations</Label>
                            <SearchableMultiSelect
                                value={editLocationIds}
                                options={locationOptions}
                                onChange={setEditLocationIds}
                                placeholder="Search to add locations..."
                            />
                        </div>

                        {/* Involved Organizations */}
                        <div>
                            <Label>Involved Organizations</Label>
                            <SearchableMultiSelect
                                value={editOrganizationIds}
                                options={organizationOptions}
                                onChange={setEditOrganizationIds}
                                placeholder="Search to add organizations..."
                            />
                        </div>

                        {/* Saving Indicator */}
                        {isSaving && (
                            <div
                                style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-subtle)",
                                    textAlign: "center",
                                }}
                            >
                                Saving...
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer with Delete Button */}
            <div
                style={{
                    padding: "1rem",
                    borderTop: "1px solid var(--stroke)",
                }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    style={{
                        width: "100%",
                        color: "var(--danger)",
                    }}
                >
                    Delete Event
                </Button>
            </div>

            <ConfirmationDialog
                open={isDeleteDialogOpen}
                onOpenChange={setIsDeleteDialogOpen}
                title="Delete Event"
                description={`Are you sure you want to delete "${displayTitle || "this event"}"? This action cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={handleDeleteEvent}
                variant="danger"
            />

            <style>{`
                @keyframes slideInFromLeft {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
};
