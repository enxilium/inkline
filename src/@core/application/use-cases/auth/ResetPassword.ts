import { IAuthService } from "../../../domain/services/IAuthService";

export interface ResetPasswordRequest {
    email: string;
}

export interface ResetPasswordResponse {
    success: boolean;
}

export class ResetPassword {
    constructor(private readonly authService: IAuthService) {}

    async execute(
        request: ResetPasswordRequest
    ): Promise<ResetPasswordResponse> {
        const email = request.email?.trim().toLowerCase();

        if (!email) {
            throw new Error("Email is required.");
        }

        await this.authService.resetPassword(email);

        return { success: true };
    }
}
