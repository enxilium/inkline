/**
 * Timeline entity represents a chronological sequence of events.
 *
 * timeUnit: The standard unit of time display. Either:
 *   - "CE" (Common Era / AD / Year) - supports year, month, day
 *   - "BCE" (Before Common Era / BC) - supports year, month, day
 *   - Custom string (e.g., "Age of Heroes") - year only
 * startValue: The numeric year value at the start/left-most of the timeline (e.g., 1948 for 1948 CE).
 *             Must be >= 0 for CE/BCE, can be any value for custom units.
 */
export class Timeline {
    constructor(
        public id: string,
        public projectId: string,
        public name: string,
        public description: string,
        public timeUnit: string,
        public startValue: number,
        public eventIds: string[],
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
