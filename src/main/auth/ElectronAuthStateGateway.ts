import { BrowserWindow } from "electron";
import { EventEmitter } from "events";
import type { User } from "../../@core/domain/entities/user/User";
import {
    AUTH_STATE_CHANGED_CHANNEL,
    type AuthStateGateway,
    type AuthStatePayload,
    createGuestSnapshot,
    mapUserToSerializable,
    type SetAuthStateOptions,
} from "../../@interface-adapters/controllers/auth/AuthStateGateway";

export class ElectronAuthStateGateway
    extends EventEmitter
    implements AuthStateGateway
{
    private snapshot: AuthStatePayload = createGuestSnapshot();

    setUser(user: User | null, options?: SetAuthStateOptions): void {
        if (user) {
            this.snapshot = {
                user: mapUserToSerializable(user),
                currentUserId: user.id,
                isAuthenticated: true,
                isGuest: false,
                migrationInProgress:
                    options?.migrationInProgress ??
                    this.snapshot.migrationInProgress,
            };
        } else {
            this.snapshot = createGuestSnapshot({
                currentUserId: options?.currentUserId,
                migrationInProgress:
                    options?.migrationInProgress ??
                    this.snapshot.migrationInProgress,
            });
        }

        this.emit("auth-changed", this.snapshot);
        this.broadcast();
    }

    setMigrationInProgress(value: boolean): void {
        if (this.snapshot.migrationInProgress === value) {
            return;
        }

        this.snapshot = {
            ...this.snapshot,
            migrationInProgress: value,
        };

        this.emit("auth-changed", this.snapshot);
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
