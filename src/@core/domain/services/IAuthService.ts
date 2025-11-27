import { User } from "../entities/user/User";

export interface IAuthService {
    login(email: string, password: string): Promise<User>;
    register(email: string, password: string): Promise<User>;
    logout(): Promise<void>;
    getCurrentUser(): Promise<User | null>;
    resetPassword(email: string): Promise<void>;
}
