import { isGuestUserId } from "../../@core/domain/constants/GuestUserConstants";
import { SupabaseService } from "../db/SupabaseService";

export type RuntimeMode = "guest" | "authenticated";

export class RuntimeModeService {
    private mode: RuntimeMode = "guest";

    setAuthenticatedUser(userId: string | null): void {
        const normalized = (userId ?? "").trim();
        this.mode =
            normalized.length > 0 && !isGuestUserId(normalized)
                ? "authenticated"
                : "guest";
    }

    getMode(): RuntimeMode {
        return this.mode;
    }

    isGuestMode(): boolean {
        return this.mode === "guest";
    }

    isAuthenticatedMode(): boolean {
        return this.mode === "authenticated";
    }

    isCloudAvailable(): boolean {
        return SupabaseService.hasCredentials();
    }

    canUseCloud(): boolean {
        return this.isAuthenticatedMode() && this.isCloudAvailable();
    }
}
