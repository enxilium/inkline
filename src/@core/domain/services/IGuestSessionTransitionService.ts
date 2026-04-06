import { User } from "../entities/user/User";

export type GuestDataMigrationResult = {
    migratedProjectIds: string[];
    skippedProjectIds: string[];
};

export interface IGuestSessionTransitionService {
    stageAuthenticatedUser(user: User): void;
    peekStagedAuthenticatedUser(): User | null;
    clearStagedAuthenticatedUser(): void;
    hasGuestProjects(): Promise<boolean>;
    countGuestProjects(): Promise<number>;
    migrateGuestData(targetUser: User): Promise<GuestDataMigrationResult>;
    discardGuestData(): Promise<void>;
}
