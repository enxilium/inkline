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

// Simplified time unit presets: CE (includes AD/Year) and BCE (includes BC)
const TIME_UNIT_PRESETS = [
    { label: "CE (Common Era / AD / Year)", value: "CE" },
    { label: "BCE (Before Common Era / BC)", value: "BCE" },
    { label: "Custom", value: "custom" },
];

// Helper to check if a unit is a calendar-based unit (CE/BCE)
const isCalendarUnit = (unit: string): boolean => {
    return unit === "CE" || unit === "BCE";
};

interface TimelineSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    timeline: {
        id: string;
        name: string;
        timeUnit: string;
        startValue: number;
    } | null;
    onSave: (data: { timeUnit: string; startValue: number }) => void;
}

export const TimelineSettingsDialog: React.FC<TimelineSettingsDialogProps> = ({
    open,
    onOpenChange,
    timeline,
    onSave,
}) => {
    const [timeUnit, setTimeUnit] = useState("");
    const [customUnit, setCustomUnit] = useState("");
    const [startValue, setStartValue] = useState("0");
    const [isCustomUnit, setIsCustomUnit] = useState(false);
    const [startValueError, setStartValueError] = useState("");

    useEffect(() => {
        if (open && timeline) {
            const preset = TIME_UNIT_PRESETS.find(
                (p) => p.value === timeline.timeUnit
            );
            if (preset && preset.value !== "custom") {
                setTimeUnit(timeline.timeUnit);
                setIsCustomUnit(false);
                setCustomUnit("");
            } else {
                setTimeUnit("custom");
                setIsCustomUnit(true);
                setCustomUnit(timeline.timeUnit);
            }
            setStartValue(String(timeline.startValue ?? 0));
            setStartValueError("");
        }
    }, [open, timeline]);

    const handlePresetChange = (value: string) => {
        setTimeUnit(value);
        setIsCustomUnit(value === "custom");
        if (value !== "custom") {
            setCustomUnit("");
            // Validate startValue for non-custom units
            const parsed = parseInt(startValue, 10);
            if (!isNaN(parsed) && parsed < 0) {
                setStartValue("0");
                setStartValueError("");
            }
        } else {
            setStartValueError("");
        }
    };

    const handleStartValueChange = (value: string) => {
        setStartValue(value);
        const parsed = parseInt(value, 10);
        const effectiveUnit = isCustomUnit
            ? customUnit.trim() || "Unit"
            : timeUnit;

        if (
            !isCustomUnit &&
            isCalendarUnit(effectiveUnit) &&
            !isNaN(parsed) &&
            parsed < 0
        ) {
            setStartValueError(
                "Start value must be 0 or greater for CE/BCE timelines"
            );
        } else {
            setStartValueError("");
        }
    };

    const handleSubmit = () => {
        const finalUnit = isCustomUnit ? customUnit.trim() || "Unit" : timeUnit;
        let parsedStart = parseInt(startValue, 10);

        // Enforce >= 0 for CE/BCE
        if (
            isCalendarUnit(finalUnit) &&
            (isNaN(parsedStart) || parsedStart < 0)
        ) {
            parsedStart = 0;
        } else if (isNaN(parsedStart)) {
            parsedStart = 0;
        }

        onSave({
            timeUnit: finalUnit,
            startValue: parsedStart,
        });
        onOpenChange(false);
    };

    if (!timeline) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle>
                        Timeline Settings: {timeline.name}
                    </DialogTitle>
                </DialogHeader>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                        padding: "1rem 0",
                    }}
                >
                    {/* Time Unit Section */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                        }}
                    >
                        <Label htmlFor="timeUnit">Time Unit</Label>
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                margin: 0,
                            }}
                        >
                            CE/BCE timelines support year, month, and day.
                            Custom units support year only.
                        </p>
                        <div
                            style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.5rem",
                                marginTop: "0.5rem",
                            }}
                        >
                            {TIME_UNIT_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() =>
                                        handlePresetChange(preset.value)
                                    }
                                    style={{
                                        padding: "0.4rem 0.75rem",
                                        borderRadius: "0.375rem",
                                        border: "1px solid var(--stroke)",
                                        backgroundColor:
                                            timeUnit === preset.value
                                                ? "var(--accent)"
                                                : "transparent",
                                        color:
                                            timeUnit === preset.value
                                                ? "var(--surface)"
                                                : "inherit",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        transition: "all 0.15s ease",
                                    }}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        {isCustomUnit && (
                            <Input
                                id="customUnit"
                                value={customUnit}
                                onChange={(e) => setCustomUnit(e.target.value)}
                                placeholder="Enter custom unit (e.g., Age of Fire)"
                                style={{ marginTop: "0.5rem" }}
                            />
                        )}
                    </div>

                    {/* Start Value Section */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                        }}
                    >
                        <Label htmlFor="startValue">Start Value (Year)</Label>
                        <p
                            style={{
                                fontSize: "0.8rem",
                                color: "var(--text-muted)",
                                margin: 0,
                            }}
                        >
                            The starting year at the left-most position of the
                            timeline.
                            {!isCustomUnit &&
                                " Must be 0 or greater for CE/BCE timelines."}
                        </p>
                        <Input
                            id="startValue"
                            type="number"
                            value={startValue}
                            onChange={(e) =>
                                handleStartValueChange(e.target.value)
                            }
                            placeholder="e.g., 1948"
                            min={isCustomUnit ? undefined : 0}
                            style={{ marginTop: "0.5rem" }}
                        />
                        {startValueError && (
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    color: "var(--error)",
                                    margin: 0,
                                }}
                            >
                                {startValueError}
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!!startValueError}
                    >
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
