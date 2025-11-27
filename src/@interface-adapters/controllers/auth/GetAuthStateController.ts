import type { AuthStateGateway, AuthStatePayload } from "./AuthStateGateway";
import type { Controller } from "../Controller";

export class GetAuthStateController
    implements Controller<[], AuthStatePayload>
{
    constructor(private readonly authStateGateway: AuthStateGateway) {}

    async handle(): Promise<AuthStatePayload> {
        return this.authStateGateway.getSnapshot();
    }
}
