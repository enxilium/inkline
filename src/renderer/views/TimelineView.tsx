import React, {
    useState,
    useMemo,
    useRef,
    useEffect,
    useCallback,
    createContext,
    useContext,
} from "react";
import { useAppStore } from "../state/appStore";
import { EventType } from "../../@core/domain/entities/story/timeline/Event";
import {
    PlusIcon,
    RefreshCwIcon,
    ChevronDownIcon,
    SettingsIcon,
} from "../components/ui/Icons";
import { Button } from "../components/ui/Button";
import { TimelineCreationDialog } from "../components/dialogs/TimelineCreationDialog";
import { TimelineNodeCreationDialog } from "../components/dialogs/TimelineNodeCreationDialog";
import { DocumentSearchDialog } from "../components/dialogs/DocumentSearchDialog";
import { ConfirmationDialog } from "../components/dialogs/ConfirmationDialog";
import { TimelineSettingsDialog } from "../components/dialogs/TimelineSettingsDialog";
import { EventTypeMenu } from "../components/timeline/EventTypeMenu";
import { EventPeekPanel } from "../components/timeline/EventPeekPanel";

// ============================================================================
// VIRTUAL TIMELINE SYSTEM
// ============================================================================
// Instead of using react-zoom-pan-pinch which physically transforms the DOM,
// we use a virtual system where:
// - `scale` controls zoom level (affects pixels per year)
// - `offsetX` is the horizontal pan offset (in pixels)
// - Elements are positioned based on virtual coordinates, not DOM transforms
// - Only visible elements are rendered (virtual windowing)
// - Left boundary is enforced (can't pan past time=0)
// - Infinite scrolling to the right

interface TimelineTransformState {
    scale: number; // Zoom level (1 = default)
    offsetX: number; // Horizontal pan offset in pixels (0 = start is centered)
}

interface TimelineTransformContext extends TimelineTransformState {
    setScale: (scale: number) => void;
    setOffsetX: (offsetX: number) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    reset: () => void;
    // Convert between time (years) and screen pixels
    timeToPixel: (time: number, startValue: number) => number;
    pixelToTime: (pixel: number, startValue: number) => number;
    // Get visible time range
    getVisibleRange: (startValue: number) => {
        minTime: number;
        maxTime: number;
    };
}

const TimelineTransformContext = createContext<TimelineTransformContext | null>(
    null
);

const useTimelineTransform = () => {
    const context = useContext(TimelineTransformContext);
    if (!context) {
        throw new Error(
            "useTimelineTransform must be used within TimelineTransformProvider"
        );
    }
    return context;
};

// Local TrashIcon since it's missing in Icons.tsx
const TrashIcon = ({
    size = 16,
    style,
}: {
    size?: number | string;
    style?: React.CSSProperties;
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

// Local MinusIcon to match existing icons style since it's missing in Icons.tsx
const MinusIcon = ({
    size = 16,
    style,
}: {
    size?: number | string;
    style?: React.CSSProperties;
}) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={style}
    >
        <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
);

// Canvas dimensions - using a Desmos-like approach where:
// - At scale 1, we show decades/centuries depending on range
// - As we zoom in, grid subdivides to show smaller units
// - Labels dynamically adjust to show appropriate detail
const BASE_GRID_SIZE = 40; // Base size for grid cells in pixels

// Month names for display
const MONTH_NAMES = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

// Zoom levels for label rendering - smooth transition from years to days
// Each level shows a consistent unit across all labels
type ZoomLevel =
    | "years"
    | "months"
    | "half-months" // ~15 day intervals
    | "weeks" // ~7 day intervals
    | "days"; // Every day

// Calculate effective pixels per year based on scale
// This determines what level of detail we can show
const getEffectivePixelsPerYear = (scale: number): number => {
    // Base: at scale 1, 1 year = BASE_GRID_SIZE pixels
    // This means at scale 1, we can comfortably show ~50 years on a 1920px screen
    return BASE_GRID_SIZE * scale;
};

// Determine zoom level based on how many pixels per year we have
// Smooth progression: years -> months -> half-months -> weeks -> days
// Only transition when there's PLENTY of space for labels
const getZoomLevel = (scale: number): ZoomLevel => {
    const pixelsPerYear = getEffectivePixelsPerYear(scale);
    const pixelsPerMonth = pixelsPerYear / 12;
    const pixelsPerDay = pixelsPerYear / 365;

    // Higher thresholds ensure labels never overlap
    // Month labels need ~50px, but sub-month labels need MORE space
    // because they show longer text like "Jan 15" or day numbers with context
    const minMonthPx = 50;
    const minHalfMonthPx = 80; // Half-month labels show "15" with month context nearby
    const minWeekPx = 60; // Week labels show day numbers
    const minDayPx = 35; // Individual days need less space (just "1", "2", etc.)

    // If each day is at least minDayPx, show days
    if (pixelsPerDay >= minDayPx) return "days";

    // If each week is at least minWeekPx, show weeks
    if (pixelsPerDay * 7 >= minWeekPx) return "weeks";

    // If each half-month (~15 days) is at least minHalfMonthPx, show half-months
    if (pixelsPerDay * 15 >= minHalfMonthPx) return "half-months";

    // If each month is at least minMonthPx, show months
    if (pixelsPerMonth >= minMonthPx) return "months";

    // Otherwise show years
    return "years";
};

// Calculate if text labels should be shown based on available space
// Returns the interval at which to show text (1 = every label, 2 = every other, etc.)
const getLabelTextInterval = (scale: number, zoomLevel: ZoomLevel): number => {
    const pixelsPerYear = getEffectivePixelsPerYear(scale);
    const pixelsPerDay = pixelsPerYear / 365;

    if (zoomLevel === "days") {
        // Days need ~35px minimum for labels like "1", "15", etc.
        const minPx = 35;
        if (pixelsPerDay >= minPx) return 1;
        if (pixelsPerDay * 2 >= minPx) return 2;
        if (pixelsPerDay * 5 >= minPx) return 5;
        return 7; // Show weekly
    }

    if (zoomLevel === "weeks") {
        // Weeks show labels like "1", "8", "15", "22"
        const pixelsPerWeek = pixelsPerDay * 7;
        const minPx = 50;
        if (pixelsPerWeek >= minPx) return 1;
        return 2; // Show every 2 weeks
    }

    if (zoomLevel === "half-months") {
        // Half-months always show both markers (1st and 15th)
        return 1;
    }

    if (zoomLevel === "months") {
        const pixelsPerMonth = pixelsPerYear / 12;
        const minPx = 50;
        if (pixelsPerMonth >= minPx) return 1;
        if (pixelsPerMonth * 2 >= minPx) return 2;
        if (pixelsPerMonth * 3 >= minPx) return 3;
        return 6; // Show every 6 months
    }

    // Years level
    const minPx = 50;
    if (pixelsPerYear >= minPx) return 1;
    const desiredInterval = minPx / pixelsPerYear;
    const intervals = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
    for (const interval of intervals) {
        if (interval >= desiredInterval) return interval;
    }
    return 1000;
};

// Calculate grid size to match the current zoom level's time unit
// Grid lines align with: years or months only (calendar-accurate)
// At deeper zoom levels (days/weeks/half-months), we use tick marks as gridlines
// because days have variable spacing (months have 28-31 days)
const getGridSize = (scale: number): number => {
    const pixelsPerYear = getEffectivePixelsPerYear(scale);
    const zoomLevel = getZoomLevel(scale);

    // At days/weeks/half-months level, the tick marks serve as gridlines
    // Use month-based grid as the background pattern for visual continuity
    if (
        zoomLevel === "days" ||
        zoomLevel === "weeks" ||
        zoomLevel === "half-months"
    ) {
        // Use month grid - this won't perfectly align with day ticks
        // but day ticks ARE the actual gridlines at these zoom levels
        return pixelsPerYear / 12;
    }

    if (zoomLevel === "months") {
        // 1 month
        return pixelsPerYear / 12;
    }

    // Years level: 1 year
    return pixelsPerYear;
};

// Check if current zoom level should show tick marks as primary gridlines
// (i.e., when calendar irregularity matters)
const shouldUseTicksAsGrid = (scale: number): boolean => {
    const zoomLevel = getZoomLevel(scale);
    return (
        zoomLevel === "days" ||
        zoomLevel === "weeks" ||
        zoomLevel === "half-months"
    );
};

// Helper to check if a time unit is calendar-based (CE/BCE)
const isCalendarUnit = (unit: string): boolean => {
    const normalized = unit.toUpperCase();
    return (
        normalized === "CE" ||
        normalized === "BCE" ||
        normalized === "AD" ||
        normalized === "BC"
    );
};

// Convert a fractional year position to year/month/day (used for display)
const yearToDate = (
    yearFraction: number
): { year: number; month: number; day: number } => {
    const year = Math.floor(yearFraction);
    const remainder = yearFraction - year;
    const dayOfYear = remainder * 365;

    // Approximate month and day
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

    return { year, month, day };
};

// Convert year/month/day to fractional year position
const dateToYear = (year: number, month: number, day: number): number => {
    const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = day - 1;
    for (let m = 0; m < month; m++) {
        dayOfYear += daysInMonths[m];
    }
    return year + dayOfYear / 365;
};

// ============================================================================
// TIMELINE TRANSFORM PROVIDER
// ============================================================================
// Provides pan/zoom state and handlers to child components

const MIN_SCALE = 0.1;
const MAX_SCALE = 200; // Allow zooming to day level (needs ~400px/year = scale 10)
const ZOOM_SENSITIVITY = 0.003; // Slightly faster zoom
const PAN_SENSITIVITY = 1;

interface TimelineTransformProviderProps {
    children: React.ReactNode;
    startValue: number;
    maxEventTime?: number; // Latest event time for calculating initial scale
}

const TimelineTransformProvider: React.FC<TimelineTransformProviderProps> = ({
    children,
    startValue,
    maxEventTime,
}) => {
    const viewportWidth =
        typeof window !== "undefined" ? window.innerWidth : 1920;

    // Calculate initial scale to fit all events with some padding
    const calculateIdealScale = useCallback(
        (eventTime: number | undefined) => {
            if (!eventTime || eventTime <= startValue) {
                // No events or all events at start - show a reasonable default (5 years visible)
                const defaultYearsVisible = 5;
                return viewportWidth / (defaultYearsVisible * BASE_GRID_SIZE);
            }

            const timeRange = eventTime - startValue;
            // Add 20% padding on the right
            const paddedRange = timeRange * 1.2;
            // Calculate scale so that paddedRange years fit in viewport
            // viewportWidth = paddedRange * BASE_GRID_SIZE * scale
            // scale = viewportWidth / (paddedRange * BASE_GRID_SIZE)
            const calculatedScale =
                viewportWidth / (paddedRange * BASE_GRID_SIZE);

            // Clamp to reasonable bounds
            return Math.min(MAX_SCALE, Math.max(MIN_SCALE, calculatedScale));
        },
        [startValue, viewportWidth]
    );

    const [scale, setScaleState] = useState(() =>
        calculateIdealScale(maxEventTime)
    );
    const [offsetX, setOffsetXState] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset scale and offset when timeline changes (startValue changes)
    const prevStartValue = useRef(startValue);
    useEffect(() => {
        // Reset to ideal scale when switching timelines
        if (prevStartValue.current !== startValue) {
            prevStartValue.current = startValue;
            setScaleState(calculateIdealScale(maxEventTime));
            setOffsetXState(0);
        }
    }, [startValue, maxEventTime, calculateIdealScale]);
    const isDragging = useRef(false);
    const lastMouseX = useRef(0);

    // Convert time (years from epoch) to screen X position
    // startValue is at x=0 (left edge) when offsetX=0
    const timeToPixel = useCallback(
        (time: number, start: number): number => {
            const pixelsPerYear = getEffectivePixelsPerYear(scale);
            const timeDiff = time - start;
            return timeDiff * pixelsPerYear - offsetX;
        },
        [scale, offsetX]
    );

    // Convert screen X position to time (years from epoch)
    const pixelToTime = useCallback(
        (pixel: number, start: number): number => {
            const pixelsPerYear = getEffectivePixelsPerYear(scale);
            const timeDiff = (pixel + offsetX) / pixelsPerYear;
            return start + timeDiff;
        },
        [scale, offsetX]
    );

    // Get visible time range based on current viewport
    const getVisibleRange = useCallback(
        (start: number): { minTime: number; maxTime: number } => {
            return {
                minTime: pixelToTime(0, start),
                maxTime: pixelToTime(viewportWidth, start),
            };
        },
        [pixelToTime, viewportWidth]
    );

    // Constrain offsetX so we can't pan past time=startValue (left boundary)
    // With left-edge coordinate system: startValue is at x=0 when offsetX=0
    // offsetX < 0 would show negative time (before startValue)
    const constrainOffsetX = useCallback((newOffsetX: number): number => {
        // Minimum offsetX is 0 (can't pan left of startValue)
        // No maximum - can pan right infinitely
        return Math.max(0, newOffsetX);
    }, []);

    const setScale = useCallback((newScale: number) => {
        setScaleState(Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale)));
    }, []);

    const setOffsetX = useCallback(
        (newOffsetX: number) => {
            setOffsetXState(constrainOffsetX(newOffsetX));
        },
        [constrainOffsetX]
    );

    const zoomIn = useCallback(() => {
        setScale(scale * 1.3);
    }, [scale, setScale]);

    const zoomOut = useCallback(() => {
        setScale(scale / 1.3);
    }, [scale, setScale]);

    const reset = useCallback(() => {
        setScaleState(1);
        setOffsetXState(0);
    }, []);

    // Handle wheel zoom - only changes scale, does not move camera
    const handleWheel = useCallback(
        (e: WheelEvent) => {
            e.preventDefault();

            // Calculate zoom
            const zoomFactor = 1 - e.deltaY * ZOOM_SENSITIVITY;
            const newScale = Math.min(
                MAX_SCALE,
                Math.max(MIN_SCALE, scale * zoomFactor)
            );

            // Just update scale - don't adjust offsetX
            // This keeps the left edge anchored and zooms "from the left"
            setScaleState(newScale);
        },
        [scale]
    );

    // Handle mouse drag for panning
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Only pan on left click and not on interactive elements
        if (e.button !== 0) return;
        isDragging.current = true;
        lastMouseX.current = e.clientX;
    }, []);

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDragging.current) return;
            const deltaX = e.clientX - lastMouseX.current;
            lastMouseX.current = e.clientX;
            setOffsetX(offsetX - deltaX * PAN_SENSITIVITY);
        },
        [offsetX, setOffsetX]
    );

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
    }, []);

    // Attach event listeners
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener("wheel", handleWheel, { passive: false });
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            container.removeEventListener("wheel", handleWheel);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [handleWheel, handleMouseMove, handleMouseUp]);

    const contextValue: TimelineTransformContext = {
        scale,
        offsetX,
        setScale,
        setOffsetX,
        zoomIn,
        zoomOut,
        reset,
        timeToPixel,
        pixelToTime,
        getVisibleRange,
    };

    return (
        <TimelineTransformContext.Provider value={contextValue}>
            <div
                ref={containerRef}
                onMouseDown={handleMouseDown}
                style={{
                    width: "100%",
                    height: "100%",
                    cursor: isDragging.current ? "grabbing" : "grab",
                    overflow: "hidden",
                    position: "relative",
                }}
            >
                {children}
            </div>
        </TimelineTransformContext.Provider>
    );
};

// ============================================================================
// AXIS LABELS COMPONENT (Virtual Rendering)
// ============================================================================
// Renders axis labels only for the visible range
const AxisLabels: React.FC<{
    startValue: number;
    timeUnit: string;
}> = ({ startValue, timeUnit }) => {
    const { scale, timeToPixel, getVisibleRange } = useTimelineTransform();

    const zoomLevel = getZoomLevel(scale);
    const useCalendar = isCalendarUnit(timeUnit);
    const viewportWidth =
        typeof window !== "undefined" ? window.innerWidth : 1920;

    // Get visible time range with some buffer
    const { minTime: visibleMin, maxTime: visibleMax } =
        getVisibleRange(startValue);
    const buffer = (visibleMax - visibleMin) * 0.5;
    const rangeMin = visibleMin - buffer;
    const rangeMax = visibleMax + buffer;

    // Generate labels based on zoom level
    // Each zoom level shows a TICK for every unit, but text only at intervals
    const labelTextInterval = getLabelTextInterval(scale, zoomLevel);

    // Helper to get days in a month (handles February correctly)
    const getDaysInMonth = (year: number, month: number): number => {
        // Check for leap year for February
        if (month === 1) {
            const isLeapYear =
                (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
            return isLeapYear ? 29 : 28;
        }
        const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        return daysInMonths[month];
    };

    const labels = useMemo(() => {
        const labelData: {
            time: number;
            label: string;
            isYearStart: boolean;
            isMonthStart: boolean;
            isStartLabel: boolean;
            showText: boolean; // Whether to show the text label (not just tick)
            tickIndex: number; // Index within the current zoom level for interval calculation
        }[] = [];

        if (zoomLevel === "days" && useCalendar) {
            // Days view - create a tick for EVERY day
            const startYear = Math.floor(rangeMin) - 1;
            const endYear = Math.ceil(rangeMax) + 1;
            let dayIndex = 0;

            for (let year = startYear; year <= endYear; year++) {
                for (let month = 0; month < 12; month++) {
                    const daysInMonth = getDaysInMonth(year, month);
                    for (let day = 1; day <= daysInMonth; day++) {
                        const yearFraction = dateToYear(year, month, day);
                        if (
                            yearFraction < rangeMin ||
                            yearFraction > rangeMax
                        ) {
                            dayIndex++;
                            continue;
                        }

                        const isStartLabel =
                            year === startValue && month === 0 && day === 1;
                        const isMonthStart = day === 1;
                        const isYearStart = month === 0 && day === 1;

                        // Show text for day 1 (month start) or at interval
                        const showText =
                            isMonthStart ||
                            isStartLabel ||
                            labelTextInterval === 1 ||
                            (day > 1 && (day - 1) % labelTextInterval === 0);

                        labelData.push({
                            time: yearFraction,
                            label: isMonthStart
                                ? `${MONTH_NAMES[month]} ${day}`
                                : `${day}`,
                            isYearStart,
                            isMonthStart,
                            isStartLabel,
                            showText,
                            tickIndex: dayIndex,
                        });
                        dayIndex++;
                    }
                }
            }
        } else if (zoomLevel === "weeks" && useCalendar) {
            // Weeks view - create a tick every 7 days (approximately)
            const startYear = Math.floor(rangeMin) - 1;
            const endYear = Math.ceil(rangeMax) + 1;
            let weekIndex = 0;

            for (let year = startYear; year <= endYear; year++) {
                for (let month = 0; month < 12; month++) {
                    const daysInMonth = getDaysInMonth(year, month);
                    // Show ticks on days 1, 8, 15, 22, (29 if exists)
                    const weekDays = [1, 8, 15, 22, 29];
                    for (const day of weekDays) {
                        if (day > daysInMonth) continue;

                        const yearFraction = dateToYear(year, month, day);
                        if (
                            yearFraction < rangeMin ||
                            yearFraction > rangeMax
                        ) {
                            weekIndex++;
                            continue;
                        }

                        const isStartLabel =
                            year === startValue && month === 0 && day === 1;
                        const isMonthStart = day === 1;
                        const isYearStart = month === 0 && day === 1;

                        const showText =
                            isMonthStart ||
                            isStartLabel ||
                            labelTextInterval === 1 ||
                            weekIndex % labelTextInterval === 0;

                        labelData.push({
                            time: yearFraction,
                            label: isMonthStart
                                ? `${MONTH_NAMES[month]}`
                                : `${day}`,
                            isYearStart,
                            isMonthStart,
                            isStartLabel,
                            showText,
                            tickIndex: weekIndex,
                        });
                        weekIndex++;
                    }
                }
            }
        } else if (zoomLevel === "half-months" && useCalendar) {
            // Half-months view - create a tick on 1st and ~15th of each month
            const startYear = Math.floor(rangeMin) - 1;
            const endYear = Math.ceil(rangeMax) + 1;
            let halfMonthIndex = 0;

            for (let year = startYear; year <= endYear; year++) {
                for (let month = 0; month < 12; month++) {
                    // Show 1st and 15th (or 16th for months with 31 days to be more centered)
                    const halfMonthDays = [1, 15];
                    for (const day of halfMonthDays) {
                        const yearFraction = dateToYear(year, month, day);
                        if (
                            yearFraction < rangeMin ||
                            yearFraction > rangeMax
                        ) {
                            halfMonthIndex++;
                            continue;
                        }

                        const isStartLabel =
                            year === startValue && month === 0 && day === 1;
                        const isMonthStart = day === 1;
                        const isYearStart = month === 0 && day === 1;

                        labelData.push({
                            time: yearFraction,
                            label: isMonthStart
                                ? isYearStart
                                    ? `${MONTH_NAMES[month]} ${year}`
                                    : MONTH_NAMES[month]
                                : `${day}`,
                            isYearStart,
                            isMonthStart,
                            isStartLabel,
                            showText: true, // Always show text for half-months
                            tickIndex: halfMonthIndex,
                        });
                        halfMonthIndex++;
                    }
                }
            }
        } else if (zoomLevel === "months" && useCalendar) {
            // Months view - create a tick for EVERY month
            const startYear = Math.floor(rangeMin) - 1;
            const endYear = Math.ceil(rangeMax) + 1;
            let monthIndex = 0;

            for (let year = startYear; year <= endYear; year++) {
                for (let month = 0; month < 12; month++) {
                    const yearFraction = dateToYear(year, month, 1);
                    if (yearFraction < rangeMin || yearFraction > rangeMax) {
                        monthIndex++;
                        continue;
                    }

                    const isYearStart = month === 0;
                    const isStartLabel = year === startValue && month === 0;

                    // Show text for January or at interval
                    const showText =
                        isYearStart ||
                        isStartLabel ||
                        labelTextInterval === 1 ||
                        month % labelTextInterval === 0;

                    labelData.push({
                        time: yearFraction,
                        label: isYearStart
                            ? `${MONTH_NAMES[month]} ${year}`
                            : MONTH_NAMES[month],
                        isYearStart,
                        isMonthStart: true,
                        isStartLabel,
                        showText,
                        tickIndex: monthIndex,
                    });
                    monthIndex++;
                }
            }
        } else {
            // Years view - create a tick for EVERY year
            const startYear = Math.floor(rangeMin);
            const endYear = Math.ceil(rangeMax);

            for (let year = startYear; year <= endYear; year++) {
                const isStartLabel = year === startValue;

                // Show text at interval or for start label
                const showText =
                    isStartLabel ||
                    labelTextInterval === 1 ||
                    year % labelTextInterval === 0;

                labelData.push({
                    time: year,
                    label: `${year}`,
                    isYearStart: true,
                    isMonthStart: true,
                    isStartLabel,
                    showText,
                    tickIndex: year,
                });
            }
        }

        return labelData;
    }, [
        zoomLevel,
        useCalendar,
        rangeMin,
        rangeMax,
        startValue,
        labelTextInterval,
    ]);

    // Filter to viewport only - no more overlap filtering since we show every tick
    const filteredLabels = useMemo(() => {
        return labels.filter((label) => {
            const pixelX = timeToPixel(label.time, startValue);
            return pixelX >= -50 && pixelX <= viewportWidth + 50;
        });
    }, [labels, timeToPixel, startValue, viewportWidth]);

    // At day/week/half-month levels, ticks serve as actual gridlines
    const ticksAsGridlines = shouldUseTicksAsGrid(scale);

    return (
        <>
            {filteredLabels.map((label, idx) => {
                const pixelX = timeToPixel(label.time, startValue);

                // Skip if outside viewport (with buffer) - redundant but safe
                if (pixelX < -100 || pixelX > viewportWidth + 100) return null;

                const isImportant = label.isYearStart || label.isStartLabel;

                // When ticks are gridlines, extend them and make more visible
                const isMonthStart = label.isMonthStart;
                const tickHeight = label.isStartLabel
                    ? "100%"
                    : ticksAsGridlines
                      ? isMonthStart
                          ? "100%" // Month starts extend full height
                          : "40px" // Day ticks extend more
                      : isImportant
                        ? "16px"
                        : "10px";

                const tickWidth = label.isStartLabel
                    ? "2px"
                    : ticksAsGridlines && isMonthStart
                      ? "1.5px"
                      : isImportant
                        ? "1.5px"
                        : "1px";

                const tickColor = label.isStartLabel
                    ? "rgba(128,128,128,0.5)"
                    : ticksAsGridlines && isMonthStart
                      ? "rgba(128,128,128,0.4)"
                      : isImportant
                        ? "var(--accent)"
                        : ticksAsGridlines
                          ? "rgba(128,128,128,0.25)"
                          : "rgba(255,255,255,0.4)";

                const tickOpacity = label.isStartLabel
                    ? 1
                    : ticksAsGridlines
                      ? 1 // Full opacity since color is already semi-transparent
                      : isImportant
                        ? 0.8
                        : 0.5;

                return (
                    <React.Fragment key={idx}>
                        {/* Tick mark - extends as gridline at day/week levels */}
                        <div
                            style={{
                                position: "absolute",
                                top: label.isStartLabel
                                    ? 0
                                    : ticksAsGridlines &&
                                        (isMonthStart || isImportant)
                                      ? 0
                                      : "50%",
                                left: `${pixelX}px`,
                                width: tickWidth,
                                height: tickHeight,
                                backgroundColor: tickColor,
                                transform:
                                    label.isStartLabel ||
                                    (ticksAsGridlines &&
                                        (isMonthStart || isImportant))
                                        ? "translateX(-50%)"
                                        : "translate(-50%, -50%)",
                                opacity: tickOpacity,
                                zIndex: label.isStartLabel ? 47 : 48,
                                pointerEvents: "none",
                            }}
                        />
                        {/* Label below axis - only show text if showText is true */}
                        {label.showText && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: "calc(50% + 12px)",
                                    left: `${pixelX}px`,
                                    transform: "translateX(-50%)",
                                    fontSize: label.isStartLabel
                                        ? "1.1rem"
                                        : isImportant
                                          ? "1rem"
                                          : "0.9rem",
                                    fontWeight: label.isStartLabel
                                        ? 600
                                        : isImportant
                                          ? 500
                                          : 400,
                                    color: label.isStartLabel
                                        ? "var(--surface)"
                                        : isImportant
                                          ? "rgba(255,255,255,0.9)"
                                          : "rgba(255,255,255,0.7)",
                                    backgroundColor: label.isStartLabel
                                        ? "var(--accent)"
                                        : "transparent",
                                    padding: label.isStartLabel
                                        ? "0.25rem 0.5rem"
                                        : "0",
                                    borderRadius: label.isStartLabel
                                        ? "0.25rem"
                                        : "0",
                                    whiteSpace: "nowrap",
                                    zIndex: label.isStartLabel ? 51 : 48,
                                    pointerEvents: "none",
                                }}
                            >
                                {label.label}
                                {label.isStartLabel && timeUnit
                                    ? ` ${timeUnit}`
                                    : ""}
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </>
    );
};

// ============================================================================
// HOVER DATE DISPLAY COMPONENT
// ============================================================================
// Shows the current date at the mouse position in the top right corner
const HoverDateDisplay: React.FC<{
    startValue: number;
    timeUnit: string;
    onHoverTimeChange: (time: number | null) => void;
}> = ({ startValue, timeUnit, onHoverTimeChange }) => {
    const { pixelToTime } = useTimelineTransform();
    const [displayTime, setDisplayTime] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();
            const isInTimeline =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            if (isInTimeline) {
                const time = pixelToTime(e.clientX - rect.left, startValue);
                setDisplayTime(time);
                onHoverTimeChange(time);
            } else {
                setDisplayTime(null);
                onHoverTimeChange(null);
            }
        };

        const handleMouseLeave = () => {
            setDisplayTime(null);
            onHoverTimeChange(null);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, [pixelToTime, startValue, onHoverTimeChange]);

    // Format the display time as a full date
    const formatDate = (time: number): string => {
        const { year, month, day } = yearToDate(time);
        const useCalendar = isCalendarUnit(timeUnit);

        if (useCalendar) {
            return `${MONTH_NAMES[month]} ${day}, ${year} ${timeUnit}`;
        }
        return `${year.toFixed(2)} ${timeUnit}`;
    };

    return (
        <>
            {/* Invisible overlay to track mouse position */}
            <div
                ref={containerRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                }}
            />
            {/* Date display in top right */}
            {displayTime !== null && (
                <div
                    style={{
                        position: "absolute",
                        top: "1rem",
                        right: "1rem",
                        backgroundColor: "rgba(0, 0, 0, 0.75)",
                        color: "white",
                        padding: "0.5rem 1rem",
                        borderRadius: "0.5rem",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        zIndex: 100,
                        pointerEvents: "none",
                        backdropFilter: "blur(4px)",
                    }}
                >
                    {formatDate(displayTime)}
                </div>
            )}
        </>
    );
};

// ============================================================================
// EVENT NODES COMPONENT (Virtual Rendering)
// ============================================================================
interface TimelineEventData {
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
    createdAt: Date;
    updatedAt: Date;
}

const EventNodes: React.FC<{
    events: TimelineEventData[];
    startValue: number;
    onEventClick: (event: TimelineEventData) => void;
    selectedEventId: string | null;
}> = ({ events, startValue, onEventClick, selectedEventId }) => {
    const { timeToPixel, getVisibleRange } = useTimelineTransform();
    const viewportWidth =
        typeof window !== "undefined" ? window.innerWidth : 1920;

    // Get visible time range to filter events
    const { minTime: visibleMin, maxTime: visibleMax } =
        getVisibleRange(startValue);
    const buffer = (visibleMax - visibleMin) * 0.5;

    const getEventColor = (type: EventType) => {
        switch (type) {
            case "chapter":
                return "#3b82f6";
            case "scrap_note":
                return "#f59e0b";
            case "event":
                return "var(--accent)";
            default:
                return "var(--accent)";
        }
    };

    const getEventIcon = (type: EventType) => {
        switch (type) {
            case "chapter":
                return "📖";
            case "scrap_note":
                return "📝";
            case "event":
                return "⭐";
            default:
                return "•";
        }
    };

    return (
        <>
            {events.map((event) => {
                // Calculate event position in time
                let eventTime: number;
                if (event.month !== null) {
                    eventTime = dateToYear(
                        event.year,
                        event.month - 1,
                        event.day ?? 1
                    );
                } else {
                    eventTime = event.year;
                }

                // Skip if outside visible range (with buffer)
                if (
                    eventTime < visibleMin - buffer ||
                    eventTime > visibleMax + buffer
                ) {
                    return null;
                }

                const pixelX = timeToPixel(eventTime, startValue);

                // Skip if outside viewport
                if (pixelX < -50 || pixelX > viewportWidth + 50) return null;

                const isSelected = event.id === selectedEventId;

                return (
                    <div
                        key={event.id}
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: `${pixelX}px`,
                            transform: "translate(-50%, -50%)",
                            zIndex: isSelected ? 60 : 55,
                            cursor: "pointer",
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onEventClick(event);
                        }}
                    >
                        {/* Node circle */}
                        <div
                            style={{
                                width: isSelected ? "28px" : "24px",
                                height: isSelected ? "28px" : "24px",
                                borderRadius: "50%",
                                backgroundColor: getEventColor(event.type),
                                border: isSelected
                                    ? "3px solid var(--text)"
                                    : "2px solid rgba(255,255,255,0.3)",
                                boxShadow: isSelected
                                    ? `0 0 12px 4px ${getEventColor(event.type)}66`
                                    : `0 2px 8px rgba(0,0,0,0.3)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                transition: "all 0.15s ease",
                            }}
                        >
                            {getEventIcon(event.type)}
                        </div>
                        {/* Label on hover or when selected */}
                        <div
                            style={{
                                position: "absolute",
                                top: "-32px",
                                left: "50%",
                                transform: "translateX(-50%)",
                                backgroundColor: "var(--surface-strong)",
                                border: "1px solid var(--stroke)",
                                borderRadius: "0.375rem",
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                color: "var(--text)",
                                whiteSpace: "nowrap",
                                opacity: isSelected ? 1 : 0,
                                pointerEvents: "none",
                                transition: "opacity 0.15s ease",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}
                            className="event-node-label"
                        >
                            {event.title || "Untitled"}
                        </div>
                    </div>
                );
            })}
            <style>{`
                div:hover > .event-node-label {
                    opacity: 1 !important;
                }
            `}</style>
        </>
    );
};

// ============================================================================
// TIMELINE CONTROLS COMPONENT
// ============================================================================
const TimelineControls: React.FC = () => {
    const { zoomIn, zoomOut, reset } = useTimelineTransform();

    return (
        <div
            style={{
                position: "absolute",
                bottom: "1rem",
                right: "1rem",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                alignItems: "flex-end",
                pointerEvents: "none",
            }}
        >
            {/* Zoom Controls */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    backgroundColor: "var(--surface)",
                    backdropFilter: "blur(4px)",
                    padding: "0.25rem",
                    borderRadius: "0.5rem",
                    border: "1px solid var(--stroke)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    pointerEvents: "auto",
                }}
            >
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomIn}
                    title="Zoom In"
                >
                    <PlusIcon size={16} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={zoomOut}
                    title="Zoom Out"
                >
                    <MinusIcon size={16} />
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} title="Reset">
                    <RefreshCwIcon size={16} />
                </Button>
            </div>
        </div>
    );
};

const TimelineView: React.FC = () => {
    const {
        timelines,
        selectedTimelineId,
        setSelectedTimelineId,
        createEvent,
        createTimeline,
        deleteTimeline,
        updateTimeline,
        projectId,
        events,
    } = useAppStore();

    const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);
    const [isTimelineCreationDialogOpen, setIsTimelineCreationDialogOpen] =
        useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
    const [isTimelineDropdownOpen, setIsTimelineDropdownOpen] = useState(false);
    const [creationTime, setCreationTime] = useState(0);

    // Hover date display state
    const [hoverTime, setHoverTime] = useState<number | null>(null);

    // Peek panel state
    const [peekPanelOpen, setPeekPanelOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<
        (typeof events)[number] | null
    >(null);

    // Derive timeline-related values early (needed by useEffect below)
    const selectedTimeline = timelines.find((t) => t.id === selectedTimelineId);
    const isMainTimeline = selectedTimeline?.name === "Main";

    // Filter events for the selected timeline and calculate time range
    const timelineEvents = useMemo(() => {
        if (!selectedTimelineId) return [];
        return events.filter((e) => e.timelineId === selectedTimelineId);
    }, [events, selectedTimelineId]);

    // Calculate max event time for initial scale
    const maxEventTime = useMemo(() => {
        if (timelineEvents.length === 0) return undefined;
        return Math.max(
            ...timelineEvents.map((e) => {
                if (e.month !== null) {
                    return dateToYear(e.year, e.month - 1, e.day ?? 1);
                }
                return e.year;
            })
        );
    }, [timelineEvents]);

    // Hover plus button state
    const [isAxisHovered, setIsAxisHovered] = useState(false);
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
    const [tooltipPosition, setTooltipPosition] = useState<"above" | "below">(
        "above"
    );
    const [eventTypeMenuOpen, setEventTypeMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [selectedEventType, setSelectedEventType] =
        useState<EventType | null>(null);
    const [isDocumentSearchOpen, setIsDocumentSearchOpen] = useState(false);
    const [documentSearchType, setDocumentSearchType] = useState<
        "chapter" | "scrap_note"
    >("chapter");
    const axisHoverZoneRef = useRef<HTMLDivElement>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Track pointer position globally to detect when we leave the axis zone
    // This is necessary because TransformComponent captures pointer events during panning
    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            // Don't show tooltip when menu is open or during dialogs
            if (
                eventTypeMenuOpen ||
                isCreationDialogOpen ||
                isDocumentSearchOpen
            ) {
                setIsAxisHovered(false);
                return;
            }

            if (!axisHoverZoneRef.current) {
                setIsAxisHovered(false);
                return;
            }

            const rect = axisHoverZoneRef.current.getBoundingClientRect();
            const isInZone =
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom;

            if (isInZone) {
                // Clear any pending hide timeout
                if (hoverTimeoutRef.current) {
                    clearTimeout(hoverTimeoutRef.current);
                    hoverTimeoutRef.current = null;
                }

                // Check if we're hovering near an existing event node
                // Calculate the time value at the current x position
                const contentWidth = window.innerWidth;
                const centerX = contentWidth / 2;
                const startValue = selectedTimeline?.startValue ?? 0;

                // Convert screen X to time value using BASE_GRID_SIZE (scale 1)
                // This is approximate since we don't have access to current scale here
                const pixelOffset = e.clientX - centerX;
                const timeAtCursor = startValue + pixelOffset / BASE_GRID_SIZE;

                // Check if any event is within a threshold distance
                // Use a pixel-based threshold for more consistent behavior
                const thresholdPixels = 30; // 30 pixels
                const thresholdTime = thresholdPixels / BASE_GRID_SIZE;

                const nearEvent = timelineEvents.find((event) => {
                    // Calculate event's pixel position
                    let eventPosition: number;
                    if (event.month !== null) {
                        eventPosition = dateToYear(
                            event.year,
                            (event.month as number) - 1,
                            event.day ?? 1
                        );
                    } else {
                        eventPosition = event.year;
                    }
                    return (
                        Math.abs(eventPosition - timeAtCursor) < thresholdTime
                    );
                });

                if (nearEvent) {
                    // Show tooltip below instead of hiding it
                    setIsAxisHovered(true);
                    setTooltipPosition("below");
                    setHoverPosition({ x: e.clientX, y: e.clientY });
                } else {
                    setIsAxisHovered(true);
                    setTooltipPosition("above");
                    setHoverPosition({ x: e.clientX, y: e.clientY });
                }
            } else {
                // Use a small delay before hiding to prevent flickering
                if (!hoverTimeoutRef.current) {
                    hoverTimeoutRef.current = setTimeout(() => {
                        setIsAxisHovered(false);
                        hoverTimeoutRef.current = null;
                    }, 50);
                }
            }
        };

        const handlePointerLeave = () => {
            // Clear any pending timeout and hide immediately on window leave
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
            }
            setIsAxisHovered(false);
        };

        document.addEventListener("pointermove", handlePointerMove);
        document.addEventListener("pointerleave", handlePointerLeave);

        return () => {
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerleave", handlePointerLeave);
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, [
        eventTypeMenuOpen,
        isCreationDialogOpen,
        isDocumentSearchOpen,
        timelineEvents,
        selectedTimeline?.startValue,
    ]);

    const handleCreateTimeline = async (data: {
        name: string;
        description: string;
    }) => {
        if (!projectId.trim()) return;
        const created = await createTimeline({
            projectId,
            name: data.name,
            description: data.description,
        });
        if (created) setSelectedTimelineId(created.id);
    };

    const handleDeleteTimeline = async () => {
        if (!selectedTimelineId || isMainTimeline) return;
        try {
            await deleteTimeline(selectedTimelineId);
        } catch (error) {
            console.error("Failed to delete timeline:", error);
        }
    };

    const handleUpdateTimelineSettings = async (data: {
        timeUnit: string;
        startValue: number;
    }) => {
        if (!selectedTimelineId) return;
        try {
            await updateTimeline({
                timelineId: selectedTimelineId,
                timeUnit: data.timeUnit,
                startValue: data.startValue,
            });
        } catch (error) {
            console.error("Failed to update timeline settings:", error);
        }
    };

    const handleCreateEvent = async (data: {
        title: string;
        description: string;
        year: number;
        month?: number | null;
        day?: number | null;
        type: EventType;
        associatedId: string | null;
    }) => {
        if (!selectedTimelineId) return;
        await createEvent({
            timelineId: selectedTimelineId,
            title: data.title,
            description: data.description,
            year: data.year,
            month: data.month,
            day: data.day,
            type: data.type,
            associatedId: data.associatedId,
        });

        // After creating, find the newly added event and open peek panel
        // We'll use a small delay to ensure the store has updated
        setTimeout(() => {
            const events = useAppStore.getState().events;
            const newEvent = events.find(
                (e) =>
                    e.timelineId === selectedTimelineId &&
                    e.year === data.year &&
                    e.title === data.title
            );
            if (newEvent) {
                setSelectedEvent(newEvent);
                setPeekPanelOpen(true);
            }
        }, 100);
    };

    // Handle axis click to open event type menu
    // Receives the calculated time from the TimelineGrid which has context access
    const handleAxisClick = (e: React.MouseEvent, calculatedTime: number) => {
        e.stopPropagation();
        setIsAxisHovered(false); // Hide tooltip when menu opens
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setCreationTime(calculatedTime);
        setEventTypeMenuOpen(true);
    };

    // Handle event type selection from menu
    const handleEventTypeSelect = (type: EventType) => {
        setSelectedEventType(type);
        // creationTime was already set by handleAxisClick with the correct value

        if (type === "chapter" || type === "scrap_note") {
            // For chapter/scrap_note, open document search dialog directly
            setDocumentSearchType(type);
            setIsDocumentSearchOpen(true);
        } else {
            // For standalone events, open the creation dialog
            setIsCreationDialogOpen(true);
        }
    };

    // Handle document selection from DocumentSearchDialog
    const handleDocumentSelect = async (document: {
        id: string;
        title: string;
        content: string;
    }) => {
        if (!selectedTimelineId || !selectedEventType) return;

        // Parse the fractional creation time into year/month/day
        const parsed = yearToDate(creationTime);
        const hasFractionalPart = creationTime !== Math.floor(creationTime);

        // Create the event linked to the selected document
        await createEvent({
            timelineId: selectedTimelineId,
            title: document.title,
            description: "", // Linked events don't need their own description
            year: parsed.year,
            month: hasFractionalPart ? parsed.month + 1 : null, // month is 0-11 from yearToDate, convert to 1-12
            day: hasFractionalPart ? parsed.day : null,
            type: selectedEventType,
            associatedId: document.id,
        });

        // Find and select the new event for the peek panel
        setTimeout(() => {
            const events = useAppStore.getState().events;
            const newEvent = events.find(
                (e) =>
                    e.timelineId === selectedTimelineId &&
                    e.year === parsed.year &&
                    e.associatedId === document.id
            );
            if (newEvent) {
                setSelectedEvent(newEvent);
                setPeekPanelOpen(true);
            }
        }, 100);
    };

    // TimelineGrid component that uses virtual transform for dynamic grid
    const TimelineGrid: React.FC<{
        children?: React.ReactNode;
        interactive?: boolean;
    }> = ({ children, interactive = false }) => {
        // Try to use context, but provide fallback for when outside provider
        let scale = 1;
        let offsetX = 0;
        let pixelToTime: ((pixel: number, start: number) => number) | null =
            null;
        try {
            const ctx = useTimelineTransform();
            scale = ctx.scale;
            offsetX = ctx.offsetX;
            pixelToTime = ctx.pixelToTime;
        } catch {
            // Outside provider, use defaults
        }

        const gridSize = getGridSize(scale);
        const useTicksAsGrid = shouldUseTicksAsGrid(scale);
        const viewportWidth =
            typeof window !== "undefined" ? window.innerWidth : 1920;
        const viewportHeight =
            typeof window !== "undefined" ? window.innerHeight : 1080;

        // Grid offset for horizontal scrolling (based on pan position)
        const gridOffsetX = ((-offsetX % gridSize) + gridSize) % gridSize;

        // Vertical offset: ensure the timeline axis (at 50% height) always sits on a gridline
        // Calculate how many full grid cells fit above the center, then offset to align
        const centerY = viewportHeight / 2;
        const gridOffsetY = centerY % gridSize;

        // Handle click on axis to calculate time from position
        const handleGridAxisClick = (e: React.MouseEvent) => {
            const startVal = selectedTimeline?.startValue ?? 0;
            let calculatedTime = startVal;

            if (pixelToTime) {
                // Calculate time from click position
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                calculatedTime = pixelToTime(clickX, startVal);
            }

            handleAxisClick(e, calculatedTime);
        };

        // When using tick marks as gridlines (days/weeks/half-months),
        // make background grid more subtle - horizontal lines only (vertical comes from ticks)
        const gridOpacity = useTicksAsGrid ? 0.08 : 0.15;

        return (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    backgroundImage: useTicksAsGrid
                        ? // At day/week level: only show horizontal lines, vertical grid from ticks
                          `linear-gradient(to bottom, rgba(128,128,128,${gridOpacity}) 1px, transparent 1px)`
                        : // At month/year level: show full grid
                          `linear-gradient(to right, rgba(128,128,128,${gridOpacity}) 1px, transparent 1px),
                           linear-gradient(to bottom, rgba(128,128,128,${gridOpacity}) 1px, transparent 1px)`,
                    backgroundSize: `${gridSize}px ${gridSize}px`,
                    backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
                    backgroundColor: "var(--surface)",
                    position: "relative",
                    boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
                }}
            >
                {/* Timeline Axis (horizontal line) */}
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: 0,
                        width: "100%",
                        height: "2px",
                        backgroundColor: "var(--accent)",
                        boxShadow: "0 0 10px 2px var(--accent-transparent2)",
                        transform: "translateY(-50%)",
                        zIndex: 50,
                    }}
                />
                {/* Hover zone for adding events */}
                {interactive && (
                    <div
                        ref={axisHoverZoneRef}
                        style={{
                            position: "absolute",
                            top: "50%",
                            left: 0,
                            width: "100%",
                            height: "40px",
                            transform: "translateY(-50%)",
                            cursor: "crosshair",
                            zIndex: 51,
                        }}
                        onClick={handleGridAxisClick}
                    />
                )}
                {children}
            </div>
        );
    };

    // ========================================================================
    // FEATURE WALL - Timeline is temporarily disabled
    // ========================================================================
    return (
        <div
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: "var(--surface)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "1.5rem",
                padding: "2rem",
                textAlign: "center",
            }}
        >
            <div
                style={{
                    fontSize: "4rem",
                    opacity: 0.3,
                }}
            >
                🚧
            </div>
            <h1
                style={{
                    fontSize: "1.5rem",
                    fontWeight: 600,
                    color: "var(--text)",
                    margin: 0,
                }}
            >
                Timeline Coming Soon
            </h1>
            <p
                style={{
                    fontSize: "1rem",
                    color: "var(--text-secondary)",
                    maxWidth: "400px",
                    lineHeight: 1.6,
                    margin: 0,
                }}
            >
                The timeline feature is currently under development. Check back
                later for an interactive way to visualize and manage your
                story&apos;s events.
            </p>
        </div>
    );
};

export default TimelineView;
