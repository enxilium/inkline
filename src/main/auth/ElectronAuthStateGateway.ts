import { BrowserWindow } from "electron";
import type { User } from "../../@core/domain/entities/user/User";
import {
    AUTH_STATE_CHANGED_CHANNEL,
    type AuthStateGateway,
    type AuthStatePayload,
    mapUserToSerializable,
} from "../../@interface-adapters/controllers/auth/AuthStateGateway";

export class ElectronAuthStateGateway implements AuthStateGateway {
    private snapshot: AuthStatePayload = { user: null };

    setUser(user: User | null): void {
        this.snapshot = {
            user: user ? mapUserToSerializable(user) : null,
        };
        this.broadcast();
    }

    getSnapshot(): AuthStatePayload {
        return this.snapshot;
    }

    private broadcast(): void {
        const windows = BrowserWindow.getAllWindows();
        for (const window of windows) {
            window.webContents.send(AUTH_STATE_CHANGED_CHANNEL, this.snapshot);
        }
    }
}
