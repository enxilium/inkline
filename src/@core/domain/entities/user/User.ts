import { UserPreferences } from "./UserPreferences";

/**
 * User entity encapsulates authentication metadata and personalization.
 */
export class User {
    constructor(
        public id: string,
        public email: string,
        public displayName: string,
        public authProvider: string,
        public createdAt: Date,
        public updatedAt: Date,
        public lastLoginAt: Date | null,
        public projectIds: string[],
        public preferences: UserPreferences
    ) {}
}
