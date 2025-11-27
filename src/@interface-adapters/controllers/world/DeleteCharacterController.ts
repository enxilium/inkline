import { Controller } from "../Controller";
import { DeleteCharacter } from "../../../@core/application/use-cases/world/DeleteCharacter";

export class DeleteCharacterController
    implements
        Controller<
            Parameters<DeleteCharacter["execute"]>,
            Awaited<ReturnType<DeleteCharacter["execute"]>>
        >
{
    constructor(private readonly deleteCharacter: DeleteCharacter) {}

    async handle(
        ...args: Parameters<DeleteCharacter["execute"]>
    ): Promise<Awaited<ReturnType<DeleteCharacter["execute"]>>> {
        return this.deleteCharacter.execute(...args);
    }
}
