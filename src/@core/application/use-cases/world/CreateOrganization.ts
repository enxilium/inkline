import { Organization } from "../../../domain/entities/story/world/Organization";
import { IOrganizationRepository } from "../../../domain/repositories/IOrganizationRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateOrganizationRequest {
    projectId: string;
}

export interface CreateOrganizationResponse {
    organization: Organization;
}

export class CreateOrganization {
    constructor(
        private readonly organizationRepository: IOrganizationRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(
        request: CreateOrganizationRequest
    ): Promise<CreateOrganizationResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error(
                "Project ID is required for organization creation."
            );
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = generateId();
        const organization = new Organization(
            id,
            "",
            "",
            "",
            [],
            [],
            [],
            null,
            null,
            now,
            now
        );

        await this.organizationRepository.create(projectId, organization);

        if (!project.organizationIds.includes(id)) {
            project.organizationIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { organization };
    }
}
