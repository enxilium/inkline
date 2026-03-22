import { Location } from "../../../domain/entities/story/world/Location";
import { MetafieldAssignment } from "../../../domain/entities/story/world/MetafieldAssignment";
import { IEditorTemplateRepository } from "../../../domain/repositories/IEditorTemplateRepository";
import { ILocationRepository } from "../../../domain/repositories/ILocationRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateLocationRequest {
    projectId: string;
    /** Optional client-generated ID used for optimistic UI flows. */
    id?: string;
    /** Optional parent location. If omitted, location is created at root level. */
    parentLocationId?: string | null;
}

export interface CreateLocationResponse {
    location: Location;
}

export class CreateLocation {
    constructor(
        private readonly locationRepository: ILocationRepository,
        private readonly projectRepository: IProjectRepository,
        private readonly editorTemplateRepository: IEditorTemplateRepository,
        private readonly metafieldDefinitionRepository: IMetafieldDefinitionRepository,
        private readonly metafieldAssignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: CreateLocationRequest,
    ): Promise<CreateLocationResponse> {
        const projectId = request.projectId.trim();
        const parentLocationId = request.parentLocationId?.trim() || null;

        if (!projectId) {
            throw new Error("Project ID is required for location creation.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = request.id?.trim() || generateId();
        const location = new Location(
            id,
            "",
            "",
            now,
            now,
            null,
            null,
            [],
            [],
            [],
            [],
        );

        await this.locationRepository.create(projectId, location);

        const editorTemplate =
            await this.editorTemplateRepository.findByProjectAndEditorType(
                projectId,
                "location",
            );

        if (!editorTemplate) {
            throw new Error("Location template is missing for this project.");
        }

        await this.seedLocationMetafieldsFromTemplate(
            projectId,
            id,
            now,
            editorTemplate.fields,
        );

        if (parentLocationId) {
            const parentLocation =
                await this.locationRepository.findById(parentLocationId);
            const projectLocationIds = new Set(
                (await this.locationRepository.findByProjectId(projectId)).map(
                    (entry) => entry.id,
                ),
            );

            if (!parentLocation || !projectLocationIds.has(parentLocationId)) {
                throw new Error("Parent location not found.");
            }

            if (!parentLocation.sublocationIds.includes(id)) {
                parentLocation.sublocationIds.push(id);
                parentLocation.updatedAt = now;
                await this.locationRepository.update(parentLocation);
            }
        } else if (!project.locationIds.includes(id)) {
            project.locationIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { location };
    }

    private async seedLocationMetafieldsFromTemplate(
        projectId: string,
        locationId: string,
        now: Date,
        fields: Array<{
            definitionId: string;
            kind: "field" | "paragraph" | "select";
            orderIndex: number;
        }>,
    ): Promise<void> {
        const orderedFields = [...fields].sort(
            (a, b) => a.orderIndex - b.orderIndex,
        );

        let orderIndex = 0;
        for (const field of orderedFields) {
            const definition =
                await this.metafieldDefinitionRepository.findById(
                    field.definitionId,
                );

            if (!definition || definition.projectId !== projectId) {
                continue;
            }

            const assignment = new MetafieldAssignment(
                generateId(),
                projectId,
                definition.id,
                "location",
                locationId,
                field.kind === "select"
                    ? { kind: field.kind, value: [] as string[] }
                    : { kind: field.kind, value: "" },
                orderIndex,
                now,
                now,
            );

            await this.metafieldAssignmentRepository.create(assignment);
            orderIndex += 1;
        }
    }
}
