import { Location } from "../entities/story/world/Location";

export interface ILocationRepository {
    create(projectId: string, location: Location): Promise<void>;
    findById(projectId: string, id: string): Promise<Location | null>;
    findByProjectId(projectId: string): Promise<Location[]>;
    update(projectId: string, location: Location): Promise<void>;
    delete(projectId: string, id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
    getLocationProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]>;
}
