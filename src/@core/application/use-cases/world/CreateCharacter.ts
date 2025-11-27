import { Character } from "../../../domain/entities/story/world/Character";
import { ICharacterRepository } from "../../../domain/repositories/ICharacterRepository";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { generateId } from "../../utils/id";

export interface CreateCharacterRequest {
    projectId: string;
}

export interface CreateCharacterResponse {
    character: Character;
}

export class CreateCharacter {
    constructor(
        private readonly characterRepository: ICharacterRepository,
        private readonly projectRepository: IProjectRepository
    ) {}

    async execute(
        request: CreateCharacterRequest
    ): Promise<CreateCharacterResponse> {
        const projectId = request.projectId.trim();

        if (!projectId) {
            throw new Error("Project ID is required for character creation.");
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error("Project not found.");
        }

        const now = new Date();
        const id = generateId();
        const character = new Character(
            id,
            "",
            "",
            null,
            "",
            null,
            null,
            null,
            [],
            [],
            [],
            "",
            null,
            null,
            [],
            null,
            null,
            null,
            [],
            now,
            now
        );

        await this.characterRepository.create(projectId, character);

        if (!project.characterIds.includes(id)) {
            project.characterIds.push(id);
            project.updatedAt = now;
            await this.projectRepository.update(project);
        }

        return { character };
    }
}
