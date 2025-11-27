import { Organization } from "../entities/story/world/Organization";

export interface IOrganizationRepository {
    create(projectId: string, organization: Organization): Promise<void>;
    findById(projectId: string, id: string): Promise<Organization | null>;
    findByProjectId(projectId: string): Promise<Organization[]>;
    findByLocationId(
        projectId: string,
        locationId: string
    ): Promise<Organization[]>;
    update(projectId: string, organization: Organization): Promise<void>;
    delete(projectId: string, id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
    getOrganizationProfiles(
        projectId: string
    ): Promise<{ name: string; description: string; mission?: string }[]>;
}
