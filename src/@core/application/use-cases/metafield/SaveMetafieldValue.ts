import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IMetafieldAssignmentRepository } from "../../../domain/repositories/IMetafieldAssignmentRepository";

export interface SaveMetafieldValueRequest {
    assignmentId: string;
    value?: unknown;
    orderIndex?: number;
}

export class SaveMetafieldValue {
    constructor(
        private readonly definitionRepository: IMetafieldDefinitionRepository,
        private readonly assignmentRepository: IMetafieldAssignmentRepository,
    ) {}

    async execute(request: SaveMetafieldValueRequest): Promise<void> {
        const assignmentId = request.assignmentId.trim();
        if (!assignmentId) {
            throw new Error("Assignment ID is required.");
        }

        const assignment =
            await this.assignmentRepository.findById(assignmentId);
        if (!assignment) {
            throw new Error("Metafield assignment not found.");
        }

        const definition = await this.definitionRepository.findById(
            assignment.definitionId,
        );
        if (!definition) {
            throw new Error("Metafield definition not found.");
        }

        let changed = false;

        if (request.value !== undefined) {
            const currentSerialized = JSON.stringify(assignment.valueJson);
            const nextSerialized = JSON.stringify(request.value);
            if (currentSerialized !== nextSerialized) {
                assignment.valueJson = request.value;
                changed = true;
            }
        }
        if (
            request.orderIndex !== undefined &&
            assignment.orderIndex !== request.orderIndex
        ) {
            assignment.orderIndex = request.orderIndex;
            changed = true;
        }

        if (!changed) {
            return;
        }

        assignment.updatedAt = new Date();

        await this.assignmentRepository.update(assignment);
    }
}
