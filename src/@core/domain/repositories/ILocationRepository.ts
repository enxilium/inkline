import { Location } from "../entities/story/world/Location";

export interface ILocationRepository {
    create(projectId: string, location: Location): Promise<void>;
    findById(id: string): Promise<Location | null>;
    findByProjectId(projectId: string): Promise<Location[]>;
    update(location: Location): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
    getLocationProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]>;
}
