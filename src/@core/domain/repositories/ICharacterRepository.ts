import { Character } from "../entities/story/world/Character";

export interface ICharacterRepository {
    create(projectId: string, character: Character): Promise<void>;
    findById(id: string): Promise<Character | null>;
    findByProjectId(projectId: string): Promise<Character[]>;
    update(character: Character): Promise<void>;
    delete(id: string): Promise<void>;
    deleteByProjectId(projectId: string): Promise<void>;
    getCharacterProfiles(
        projectId: string
    ): Promise<{ name: string; description: string }[]>;
}
