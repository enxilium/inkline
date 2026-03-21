export type EditorTemplateType = "character" | "location" | "organization";

export type EditorTemplateFieldKind = "field" | "paragraph" | "select";

export type EditorTemplatePlacement = {
    left: string[];
    right: string[];
};

export type EditorTemplateField = {
    definitionId: string;
    kind: EditorTemplateFieldKind;
    orderIndex: number;
};

export class EditorTemplate {
    constructor(
        public id: string,
        public projectId: string,
        public editorType: EditorTemplateType,
        public placement: EditorTemplatePlacement,
        public fields: EditorTemplateField[],
        public createdAt: Date,
        public updatedAt: Date,
    ) {}
}