import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";

export interface DeleteMetafieldDefinitionGlobalRequest {
    definitionId: string;
}

export class DeleteMetafieldDefinitionGlobal {
    constructor(
        private readonly definitionRepository: IMetafieldDefinitionRepository,
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(
        request: DeleteMetafieldDefinitionGlobalRequest,
    ): Promise<void> {
        const definitionId = request.definitionId.trim();
        if (!definitionId) {
            throw new Error("Metafield definition ID is required.");
        }

        const definition =
            await this.definitionRepository.findById(definitionId);
        if (!definition) {
            return;
        }

        await this.assignmentRepository.deleteByDefinitionId(definitionId);
        await this.definitionRepository.delete(definitionId);
    }
}
