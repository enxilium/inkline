import {
    EditorTemplate,
    EditorTemplateField,
    EditorTemplatePlacement,
    EditorTemplateType,
} from "../../../@core/domain/entities/story/world/EditorTemplate";
import { IEditorTemplateRepository } from "../../../@core/domain/repositories/IEditorTemplateRepository";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemEditorTemplate = {
    id: string;
    projectId: string;
    editorType: EditorTemplateType;
    placement: EditorTemplatePlacement;
    fields: EditorTemplateField[];
    createdAt: string;
    updatedAt: string;
};

const toPlacement = (value: unknown): EditorTemplatePlacement => {
    if (
        value &&
        typeof value === "object" &&
        Array.isArray((value as { left?: unknown }).left) &&
        Array.isArray((value as { right?: unknown }).right)
    ) {
        return {
            left: (value as { left: unknown[] }).left.filter(
                (item): item is string => typeof item === "string",
            ),
            right: (value as { right: unknown[] }).right.filter(
                (item): item is string => typeof item === "string",
            ),
        };
    }

    return { left: [], right: [] };
};

const toFields = (value: unknown): EditorTemplateField[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => {
            if (!entry || typeof entry !== "object") {
                return null;
            }

            const definitionId = (entry as { definitionId?: unknown })
                .definitionId;
            const kind = (entry as { kind?: unknown }).kind;
            const orderIndex = (entry as { orderIndex?: unknown }).orderIndex;

            if (
                typeof definitionId !== "string" ||
                (kind !== "field" && kind !== "paragraph" && kind !== "select")
            ) {
                return null;
            }

            return {
                definitionId,
                kind,
                orderIndex:
                    typeof orderIndex === "number" && Number.isFinite(orderIndex)
                        ? Math.max(0, Math.floor(orderIndex))
                        : 0,
            } satisfies EditorTemplateField;
        })
        .filter((entry): entry is EditorTemplateField => entry !== null)
        .sort((a, b) => a.orderIndex - b.orderIndex);
};

export class FileSystemEditorTemplateRepository
    implements IEditorTemplateRepository
{
    private getFilePath(
        userId: string,
        projectId: string,
        templateId: string,
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "editor-templates",
            `${templateId}.json`,
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "editor-templates",
        );
    }

    async create(template: EditorTemplate): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(template.projectId);
        if (!ownerId) return;

        await fileSystemService.writeJson(
            this.getFilePath(ownerId, template.projectId, template.id),
            this.toDto(template),
        );
    }

    async findById(id: string): Promise<EditorTemplate | null> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return null;
        }

        const dto = await fileSystemService.readJson<FileSystemEditorTemplate>(
            location.path,
        );

        return dto ? this.mapToEntity(dto) : null;
    }

    async findByProjectId(projectId: string): Promise<EditorTemplate[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const templates: EditorTemplate[] = [];

        for (const file of files) {
            if (!file.endsWith(".json")) continue;

            const dto = await fileSystemService.readJson<FileSystemEditorTemplate>(
                path.join(dirPath, file),
            );
            if (dto) {
                templates.push(this.mapToEntity(dto));
            }
        }

        return templates.sort((a, b) => a.editorType.localeCompare(b.editorType));
    }

    async findByProjectAndEditorType(
        projectId: string,
        editorType: EditorTemplateType,
    ): Promise<EditorTemplate | null> {
        const templates = await this.findByProjectId(projectId);
        return (
            templates.find((template) => template.editorType === editorType) ??
            null
        );
    }

    async update(template: EditorTemplate): Promise<void> {
        const location = await this.findFileLocation(template.id);
        if (!location) {
            return;
        }

        await fileSystemService.writeJson(location.path, this.toDto(template));
    }

    async delete(id: string): Promise<void> {
        const location = await this.findFileLocation(id);
        if (!location) {
            return;
        }

        await fileSystemService.deleteFile(location.path);
    }

    private toDto(template: EditorTemplate): FileSystemEditorTemplate {
        return {
            id: template.id,
            projectId: template.projectId,
            editorType: template.editorType,
            placement: template.placement,
            fields: template.fields,
            createdAt: template.createdAt.toISOString(),
            updatedAt: template.updatedAt.toISOString(),
        };
    }

    private mapToEntity(dto: FileSystemEditorTemplate): EditorTemplate {
        return new EditorTemplate(
            dto.id,
            dto.projectId,
            dto.editorType,
            toPlacement(dto.placement),
            toFields(dto.fields),
            new Date(dto.createdAt),
            new Date(dto.updatedAt),
        );
    }

    private async findOwnerIdByProjectId(
        projectId: string,
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");

        for (const user of users) {
            const projectPath = path.join(
                "users",
                user,
                "projects",
                `${projectId}.json`,
            );

            if (await fileSystemService.exists(projectPath)) {
                return user;
            }
        }

        return null;
    }

    private async findFileLocation(
        templateId: string,
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");

        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);

            for (const projectFile of projects) {
                if (!projectFile.endsWith(".json")) continue;

                const projectId = projectFile.replace(".json", "");
                const filePath = this.getFilePath(user, projectId, templateId);

                if (await fileSystemService.exists(filePath)) {
                    return { userId: user, projectId, path: filePath };
                }
            }
        }

        return null;
    }
}
