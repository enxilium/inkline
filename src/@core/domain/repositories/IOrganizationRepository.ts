import { Organization } from "../entities/story/world/Organization";

export interface IOrganizationRepository {
    create(projectId: string, organization: Organization): Promise<void>;
    findById(id: string): Promise<Organization | null>;
    findByProjectId(projectId: string): Promise<Organization[]>;
    findByLocationId(locationId: string): Promise<Organization[]>;
    update(organization: Organization): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
    getOrganizationProfiles(
        projectId: string
    ): Promise<{ name: string; description: string; mission?: string }[]>;
}
