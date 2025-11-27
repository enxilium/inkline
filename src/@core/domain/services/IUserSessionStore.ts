import { User } from "../entities/user/User";

/**
 * IUserSessionStore persists the authenticated user locally so that
 * subsequent launches can resume without prompting for credentials.
 */
export interface IUserSessionStore {
    load(): Promise<User | null>;
    save(user: User): Promise<void>;
    clear(): Promise<void>;
}
