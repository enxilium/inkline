import {
    OverwriteCharacter,
    OverwriteCharacterRequest,
} from "../../../@core/application/use-cases/world/OverwriteCharacter";
import { Controller } from "../Controller";

export class OverwriteCharacterController
    implements Controller<[OverwriteCharacterRequest], void>
{
    constructor(private readonly useCase: OverwriteCharacter) {}

    async handle(request: OverwriteCharacterRequest): Promise<void> {
        await this.useCase.execute(request);
    }
}
