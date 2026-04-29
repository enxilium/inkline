import { IAuthService } from "../../../domain/services/IAuthService";

export interface CompletePasswordRecoveryRequest {
    accessToken: string;
    refreshToken: string;
    newPassword: string;
}

export interface CompletePasswordRecoveryResponse {
    success: boolean;
}

export class CompletePasswordRecovery {
    constructor(private readonly authService: IAuthService) {}

    async execute(
        request: CompletePasswordRecoveryRequest,
    ): Promise<CompletePasswordRecoveryResponse> {
        const accessToken = request.accessToken?.trim();
        const refreshToken = request.refreshToken?.trim();
        const newPassword = request.newPassword;

        if (!accessToken || !refreshToken) {
            throw new Error("Recovery session is missing. Please open the link again.");
        }

        if (!newPassword) {
            throw new Error("New password is required.");
        }

        await this.authService.setSession(accessToken, refreshToken);
        await this.authService.updatePassword(newPassword);

        // Keep recovery tokens from persisting as a local session; user signs in explicitly.
        await this.authService.logout();

        return { success: true };
    }
}

