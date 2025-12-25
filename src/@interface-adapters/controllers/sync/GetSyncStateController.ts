import type { SyncStateGateway, SyncStatePayload } from "./SyncStateGateway";
import type { Controller } from "../Controller";

export class GetSyncStateController
    implements Controller<[], SyncStatePayload>
{
    constructor(private readonly syncStateGateway: SyncStateGateway) {}

    async handle(): Promise<SyncStatePayload> {
        return this.syncStateGateway.getSnapshot();
    }
}
