import { Controller } from "../Controller";
import { CreateCharacter } from "../../../@core/application/use-cases/world/CreateCharacter";

export class CreateCharacterController
    implements
        Controller<
            Parameters<CreateCharacter["execute"]>,
            Awaited<ReturnType<CreateCharacter["execute"]>>
        >
{
    constructor(private readonly createCharacter: CreateCharacter) {}

    async handle(
        ...args: Parameters<CreateCharacter["execute"]>
    ): Promise<Awaited<ReturnType<CreateCharacter["execute"]>>> {
        return this.createCharacter.execute(...args);
    }
}
