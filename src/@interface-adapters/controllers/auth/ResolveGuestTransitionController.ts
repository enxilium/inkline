import { GUEST_USER_ID } from "../../../@core/domain/constants/GuestUserConstants";
import type { IAuthService } from "../../../@core/domain/services/IAuthService";
import type { IGuestSessionTransitionService } from "../../../@core/domain/services/IGuestSessionTransitionService";
import type { IUserSessionStore } from "../../../@core/domain/services/IUserSessionStore";
import type { Controller } from "../Controller";
import type { AuthStateGateway } from "./AuthStateGateway";

export type ResolveGuestTransitionDecision = "migrate" | "discard" | "cancel";

export type ResolveGuestTransitionRequest = {
    decision: ResolveGuestTransitionDecision;
};

export type ResolveGuestTransitionResponse = {
    status: "migrated" | "discarded" | "cancelled";
    restartScheduled: boolean;
    migratedProjectIds?: string[];
    skippedProjectIds?: string[];
};

export class ResolveGuestTransitionController implements Controller<
    [ResolveGuestTransitionRequest],
    ResolveGuestTransitionResponse
> {
    constructor(
        private readonly transitionService: IGuestSessionTransitionService,
        private readonly authService: IAuthService,
        private readonly sessionStore: IUserSessionStore,
        private readonly authStateGateway: AuthStateGateway,
    ) {}

    async handle(
        request: ResolveGuestTransitionRequest,
    ): Promise<ResolveGuestTransitionResponse> {
        const stagedUser = this.transitionService.peekStagedAuthenticatedUser();
        if (!stagedUser) {
            throw new Error("No pending guest transition to resolve.");
        }

        const decision = request.decision;
        if (
            decision !== "migrate" &&
            decision !== "discard" &&
            decision !== "cancel"
        ) {
            throw new Error("Invalid guest transition decision.");
        }

        if (decision === "cancel") {
            this.transitionService.clearStagedAuthenticatedUser();
            await this.authService.logout();
            await this.sessionStore.clear();

            this.authStateGateway.setUser(null, {
                currentUserId: GUEST_USER_ID,
            });

            return {
                status: "cancelled",
                restartScheduled: false,
            };
        }

        let migratedProjectIds: string[] = [];
        let skippedProjectIds: string[] = [];

        if (decision === "migrate") {
            const result =
                await this.transitionService.migrateGuestData(stagedUser);
            migratedProjectIds = result.migratedProjectIds;
            skippedProjectIds = result.skippedProjectIds;
        } else {
            await this.transitionService.discardGuestData();
        }

        this.transitionService.clearStagedAuthenticatedUser();
        this.authStateGateway.setUser(stagedUser, {
            migrationInProgress: false,
        });

        return {
            status: decision === "migrate" ? "migrated" : "discarded",
            restartScheduled: false,
            migratedProjectIds,
            skippedProjectIds,
        };
    }
}
