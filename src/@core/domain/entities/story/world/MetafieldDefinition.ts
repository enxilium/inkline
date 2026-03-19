export type MetafieldScope =
    | "character"
    | "location"
    | "organization"
    | "project";

export type MetafieldValueType =
    | "string"
    | "string[]"
    | "entity"
    | "entity[]"
    | "image"
    | "image[]";

export type MetafieldTargetEntityKind =
    | "character"
    | "location"
    | "organization";

export class MetafieldDefinition {
    constructor(
        public id: string,
        public projectId: string,
        public name: string,
        public nameNormalized: string,
        public scope: MetafieldScope,
        public valueType: MetafieldValueType,
        public targetEntityKind: MetafieldTargetEntityKind | null,
        public createdAt: Date,
        public updatedAt: Date,
    ) {}
}
