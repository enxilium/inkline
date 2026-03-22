import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { Project } from "../../../domain/entities/story/Project";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";
import { Timeline } from "../../../domain/entities/story/timeline/Timeline";
import {
    EditorTemplate,
    EditorTemplateFieldKind,
    EditorTemplateType,
} from "../../../domain/entities/story/world/EditorTemplate";
import { MetafieldDefinition } from "../../../domain/entities/story/world/MetafieldDefinition";
import { IEditorTemplateRepository } from "../../../domain/repositories/IEditorTemplateRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { normalizeMetafieldName } from "../../utils/normalizeMetafieldName";
import { generateId } from "../../utils/id";

type DefaultTemplateSeed = {
    name: string;
    valueType: "string" | "string[]";
    kind: EditorTemplateFieldKind;
    column: "left" | "right";
};

const DEFAULT_TEMPLATE_SEEDS: Record<EditorTemplateType, DefaultTemplateSeed[]> = {
    character: [
        { name: "Age", valueType: "string", kind: "field", column: "left" },
        { name: "Race", valueType: "string", kind: "field", column: "left" },
        {
            name: "Personality",
            valueType: "string[]",
            kind: "select",
            column: "left",
        },
        {
            name: "Powers & Abilities",
            valueType: "string[]",
            kind: "select",
            column: "left",
        },
    ],
    location: [],
    organization: [],
};

export interface CreateProjectRequest {
    userId: string;
    title: string;
}

export interface CreateProjectResponse {
    project: Project;
}

export class CreateProject {
    constructor(
        private readonly projectRepository: IProjectRepository,
        private readonly userRepository: IUserRepository,
        private readonly timelineRepository: ITimelineRepository,
        private readonly metafieldDefinitionRepository: IMetafieldDefinitionRepository,
        private readonly editorTemplateRepository: IEditorTemplateRepository,
    ) {}

    async execute(
        request: CreateProjectRequest
    ): Promise<CreateProjectResponse> {
        const title = request.title.trim();
        const user = await this.userRepository.findById(request.userId);

        if (!title) {
            throw new Error("Project title is required.");
        }

        if (!user) {
            throw new Error("User not found.");
        }

        const now = new Date();
        const projectId = generateId();
        const mainTimelineId = generateId();

        // Create the Main timeline that every project must have
        const mainTimeline = new Timeline(
            mainTimelineId,
            projectId,
            "Main",
            "The primary timeline for this project",
            "CE", // Default to Common Era
            0, // Default center value
            [],
            now,
            now
        );

        const project = new Project(
            projectId,
            title,
            null,
            [],
            [],
            [],
            [],
            [],
            [mainTimelineId], // Include the Main timeline
            now,
            now
        );
        await this.projectRepository.create(request.userId, project);
        await this.timelineRepository.create(projectId, mainTimeline);
        await this.initializeDefaultTemplates(projectId, now);

        if (!user.projectIds.includes(project.id)) {
            user.projectIds.push(project.id);
            user.updatedAt = now;
            await this.userRepository.update(user);
        }

        return { project };
    }

    private async initializeDefaultTemplates(
        projectId: string,
        now: Date,
    ): Promise<void> {
        const editorTypes: EditorTemplateType[] = [
            "character",
            "location",
            "organization",
        ];

        for (const editorType of editorTypes) {
            const existingTemplate =
                await this.editorTemplateRepository.findByProjectAndEditorType(
                    projectId,
                    editorType,
                );
            if (existingTemplate) {
                continue;
            }

            const seeds = DEFAULT_TEMPLATE_SEEDS[editorType];
            const fields: EditorTemplate["fields"] = [];
            const placementLeft: string[] = [];
            const placementRight: string[] = [];

            for (const seed of seeds) {
                const definition = await this.findOrCreateDefinition(
                    projectId,
                    editorType,
                    seed,
                    now,
                );

                fields.push({
                    definitionId: definition.id,
                    kind: seed.kind,
                    orderIndex: fields.length,
                });
                if (seed.column === "left") {
                    placementLeft.push(definition.id);
                } else {
                    placementRight.push(definition.id);
                }
            }

            const template = new EditorTemplate(
                generateId(),
                projectId,
                editorType,
                { left: placementLeft, right: placementRight },
                fields,
                now,
                now,
            );

            await this.editorTemplateRepository.create(template);
        }
    }

    private async findOrCreateDefinition(
        projectId: string,
        scope: EditorTemplateType,
        seed: DefaultTemplateSeed,
        now: Date,
    ): Promise<MetafieldDefinition> {
        const normalizedName = normalizeMetafieldName(seed.name);
        const existing =
            await this.metafieldDefinitionRepository.findByProjectAndNameNormalized(
                projectId,
                normalizedName,
            );

        if (existing) {
            return existing;
        }

        const definition = new MetafieldDefinition(
            generateId(),
            projectId,
            seed.name,
            normalizedName,
            scope,
            seed.valueType,
            null,
            now,
            now,
        );

        await this.metafieldDefinitionRepository.create(definition);
        return definition;
    }
}
