/**
 * Event entity represents a point in time on a timeline.
 *
 * For CE/BCE timelines:
 *   - year: The year of the event
 *   - month: Optional month (1-12), null if not specified
 *   - day: Optional day (1-31), null if not specified
 *
 * For custom timelines:
 *   - year: The numeric time value
 *   - month/day: Always null
 *
 * The 'time' field is deprecated but kept for backward compatibility.
 * It represents year for positioning on the timeline.
 */
export type EventType = "chapter" | "scrap_note" | "event";

export class Event {
    constructor(
        public id: string,
        public timelineId: string,
        public title: string,
        public description: string,
        public time: number, // Year value for timeline positioning (deprecated, use year)
        public year: number,
        public month: number | null, // 1-12 for CE/BCE, null for custom
        public day: number | null, // 1-31 for CE/BCE, null for custom
        public type: EventType,
        public associatedId: string | null,
        public characterIds: string[],
        public locationIds: string[],
        public organizationIds: string[],
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
