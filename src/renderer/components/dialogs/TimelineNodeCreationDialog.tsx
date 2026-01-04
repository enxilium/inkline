import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { TextAreaInput } from "../ui/TextAreaInput";
import { SearchableSelect } from "../ui/SearchableSelect";
import { useAppStore } from "../../state/appStore";
import { EventType } from "../../../@core/domain/entities/story/timeline/Event";

// Convert a fractional year position to year/month/day
const yearToDate = (
    yearFraction: number
): { year: number; month: number; day: number } => {
    const year = Math.floor(yearFraction);
    const remainder = yearFraction - year;
    const dayOfYear = remainder * 365;

    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let accumulatedDays = 0;
    let month = 0;
    let day = 1;

    for (let m = 0; m < 12; m++) {
        if (accumulatedDays + daysInMonths[m] > dayOfYear) {
            month = m;
            day = Math.max(1, Math.floor(dayOfYear - accumulatedDays) + 1);
            break;
        }
        accumulatedDays += daysInMonths[m];
    }

    return { year, month: month + 1, day }; // month is 1-12 for display/storage
};

interface TimelineNodeCreationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    timelineId: string;
    initialTime: number; // Can be fractional year (e.g., 2024.5 for mid-2024)
    onCreate: (data: {
        title: string;
        description: string;
        year: number;
        month?: number | null;
        day?: number | null;
        type: EventType;
        associatedId: string | null;
    }) => void;
}

export const TimelineNodeCreationDialog: React.FC<
    TimelineNodeCreationDialogProps
> = ({ open, onOpenChange, timelineId, initialTime, onCreate }) => {
    const { chapters, scrapNotes } = useAppStore();
    const [type, setType] = useState<EventType>("event");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [year, setYear] = useState("");
    const [month, setMonth] = useState<number | null>(null);
    const [day, setDay] = useState<number | null>(null);
    const [associatedId, setAssociatedId] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            // Parse the fractional year into year/month/day
            const parsed = yearToDate(initialTime);
            setYear(parsed.year.toString());
            // Only set month/day if the fractional part is non-zero (user clicked at a specific date)
            const hasFractionalPart = initialTime !== Math.floor(initialTime);
            if (hasFractionalPart) {
                setMonth(parsed.month);
                setDay(parsed.day);
            } else {
                setMonth(null);
                setDay(null);
            }
            setTitle("");
            setDescription("");
            setAssociatedId(null);
            setType("event");
        }
    }, [open, initialTime]);

    const handleSubmit = () => {
        let finalTitle = title;
        const finalDescription = description;

        if (type === "chapter" && associatedId) {
            const chapter = chapters.find((c) => c.id === associatedId);
            if (chapter) {
                finalTitle = chapter.title;
                // Description could be chapter summary if available, or left empty
            }
        } else if (type === "scrap_note" && associatedId) {
            const note = scrapNotes.find((n) => n.id === associatedId);
            if (note) {
                finalTitle = note.title;
            }
        }

        onCreate({
            title: finalTitle,
            description: finalDescription,
            year: Number(year),
            month,
            day,
            type,
            associatedId,
        });
        onOpenChange(false);
    };

    const handleTypeChange = (newType: string) => {
        setType(newType as EventType);
        setAssociatedId(null);
        setTitle("");
    };

    const handleAssociationChange = (id: string) => {
        setAssociatedId(id);
        if (type === "chapter") {
            const chapter = chapters.find((c) => c.id === id);
            if (chapter) setTitle(chapter.title);
        } else if (type === "scrap_note") {
            const note = scrapNotes.find((n) => n.id === id);
            if (note) setTitle(note.title);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Timeline Event</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {/* Date Row: Year, Month, Day */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="year" className="text-right">
                            Date
                        </Label>
                        <div className="col-span-3 flex gap-2">
                            <Input
                                id="year"
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="Year"
                                className="flex-1"
                                min={0}
                            />
                            <select
                                id="month"
                                className="flex h-9 w-24 rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={month ?? ""}
                                onChange={(e) =>
                                    setMonth(
                                        e.target.value
                                            ? Number(e.target.value)
                                            : null
                                    )
                                }
                            >
                                <option value="">Month</option>
                                <option value="1">Jan</option>
                                <option value="2">Feb</option>
                                <option value="3">Mar</option>
                                <option value="4">Apr</option>
                                <option value="5">May</option>
                                <option value="6">Jun</option>
                                <option value="7">Jul</option>
                                <option value="8">Aug</option>
                                <option value="9">Sep</option>
                                <option value="10">Oct</option>
                                <option value="11">Nov</option>
                                <option value="12">Dec</option>
                            </select>
                            <Input
                                id="day"
                                type="number"
                                value={day ?? ""}
                                onChange={(e) =>
                                    setDay(
                                        e.target.value
                                            ? Number(e.target.value)
                                            : null
                                    )
                                }
                                placeholder="Day"
                                className="w-16"
                                min={1}
                                max={31}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
                        </Label>
                        <div className="col-span-3">
                            <select
                                id="type"
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                value={type}
                                onChange={(e) =>
                                    handleTypeChange(e.target.value)
                                }
                            >
                                <option value="event">Event</option>
                                <option value="chapter">Chapter</option>
                                <option value="scrap_note">Scrap Note</option>
                            </select>
                        </div>
                    </div>

                    {type === "event" && (
                        <>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="title" className="text-right">
                                    Title
                                </Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                    htmlFor="description"
                                    className="text-right"
                                >
                                    Description
                                </Label>
                                <TextAreaInput
                                    id="description"
                                    value={description}
                                    onChange={setDescription}
                                    className="col-span-3"
                                />
                            </div>
                        </>
                    )}

                    {type === "chapter" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="chapter" className="text-right">
                                Chapter
                            </Label>
                            <div className="col-span-3">
                                <SearchableSelect
                                    options={chapters.map((c) => ({
                                        id: c.id,
                                        label: c.title,
                                    }))}
                                    value={associatedId || ""}
                                    onChange={handleAssociationChange}
                                    placeholder="Select a chapter..."
                                />
                            </div>
                        </div>
                    )}

                    {type === "scrap_note" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="scrapNote" className="text-right">
                                Scrap Note
                            </Label>
                            <div className="col-span-3">
                                <SearchableSelect
                                    options={scrapNotes.map((n) => ({
                                        id: n.id,
                                        label: n.title,
                                    }))}
                                    value={associatedId || ""}
                                    onChange={handleAssociationChange}
                                    placeholder="Select a scrap note..."
                                />
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSubmit}>
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
