import { Project } from "../entities/story/Project";

export interface IProjectRepository {
    create(ownerId: string, project: Project): Promise<void>;
    findById(id: string): Promise<Project | null>;
    findAllByUserId(userId: string): Promise<Project[]>;
    update(project: Project): Promise<void>;
    delete(id: string): Promise<void>;
}
