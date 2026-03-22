import {
    EditorTemplate,
    EditorTemplateType,
} from "../entities/story/world/EditorTemplate";

export interface IEditorTemplateRepository {
    create(template: EditorTemplate): Promise<void>;
    findById(id: string): Promise<EditorTemplate | null>;
    findByProjectId(projectId: string): Promise<EditorTemplate[]>;
    findByProjectAndEditorType(
        projectId: string,
        editorType: EditorTemplateType,
    ): Promise<EditorTemplate | null>;
    update(template: EditorTemplate): Promise<void>;
    delete(id: string): Promise<void>;
}