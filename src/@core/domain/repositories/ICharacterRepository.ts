import { Character } from "../entities/story/world/Character";

export interface ICharacterRepository {
    create(projectId: string, character: Character): Promise<void>;
    findById(projectId: string, id: string): Promise<Character | null>;
    findByProjectId(projectId: string): Promise<Character[]>;
    update(projectId: string, character: Character): Promise<void>;
    delete(projectId: string, id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
    getCharacterProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]>;
}
