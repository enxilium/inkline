export type MetafieldAssignableEntityType =
    | "character"
    | "location"
    | "organization";

export class MetafieldAssignment {
    constructor(
        public id: string,
        public projectId: string,
        public definitionId: string,
        public entityType: MetafieldAssignableEntityType,
        public entityId: string,
        public valueJson: unknown,
        public orderIndex: number,
        public createdAt: Date,
        public updatedAt: Date,
    ) {}
}
