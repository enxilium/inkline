import { Controller } from "../Controller";
import { LoginUser } from "../../../@core/application/use-cases/auth/LoginUser";
import type { AuthStateGateway } from "./AuthStateGateway";
import type { IGuestSessionTransitionService } from "../../../@core/domain/services/IGuestSessionTransitionService";

export type LoginUserControllerResponse = Awaited<
    ReturnType<LoginUser["execute"]>
> & {
    requiresGuestTransition: boolean;
    guestProjectCount: number;
};

export class LoginUserController implements Controller<
    Parameters<LoginUser["execute"]>,
    LoginUserControllerResponse
> {
    constructor(
        private readonly loginUser: LoginUser,
        private readonly authStateGateway: AuthStateGateway,
        private readonly transitionService: IGuestSessionTransitionService,
    ) {}

    async handle(
        ...args: Parameters<LoginUser["execute"]>
    ): Promise<LoginUserControllerResponse> {
        const response = await this.loginUser.execute(...args);

        const snapshot = this.authStateGateway.getSnapshot();
        if (snapshot.isGuest) {
            const guestProjectCount =
                await this.transitionService.countGuestProjects();

            if (guestProjectCount > 0) {
                this.transitionService.stageAuthenticatedUser(response.user);
                return {
                    ...response,
                    requiresGuestTransition: true,
                    guestProjectCount,
                };
            }
        }

        this.authStateGateway.setUser(response.user);
        return {
            ...response,
            requiresGuestTransition: false,
            guestProjectCount: 0,
        };
    }
}
