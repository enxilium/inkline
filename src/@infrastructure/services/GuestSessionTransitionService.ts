import { promises as fs } from "fs";
import * as path from "path";

import type { User } from "../../@core/domain/entities/user/User";
import {
    GUEST_USER_ID,
    isGuestUserId,
} from "../../@core/domain/constants/GuestUserConstants";
import type {
    GuestDataMigrationResult,
    IGuestSessionTransitionService,
} from "../../@core/domain/services/IGuestSessionTransitionService";
import { fileSystemService } from "../storage/FileSystemService";
import { FileSystemUserRepository } from "../db/filesystem/FileSystemUserRepository";

export class GuestSessionTransitionService implements IGuestSessionTransitionService {
    private stagedAuthenticatedUser: User | null = null;

    constructor(
        private readonly localUserRepository: FileSystemUserRepository,
    ) {}

    stageAuthenticatedUser(user: User): void {
        this.stagedAuthenticatedUser = user;
    }

    peekStagedAuthenticatedUser(): User | null {
        return this.stagedAuthenticatedUser;
    }

    clearStagedAuthenticatedUser(): void {
        this.stagedAuthenticatedUser = null;
    }

    async hasGuestProjects(): Promise<boolean> {
        return (await this.countGuestProjects()) > 0;
    }

    async countGuestProjects(): Promise<number> {
        return (await this.listGuestProjectIds()).length;
    }

    async migrateGuestData(
        targetUser: User,
    ): Promise<GuestDataMigrationResult> {
        if (isGuestUserId(targetUser.id)) {
            throw new Error("Cannot migrate guest data into guest profile.");
        }

        const guestProjectIds = await this.listGuestProjectIds();
        const migratedProjectIds: string[] = [];
        const skippedProjectIds: string[] = [];

        for (const projectId of guestProjectIds) {
            const guestProjectMetaPath = this.getProjectMetadataRelativePath(
                GUEST_USER_ID,
                projectId,
            );
            const targetProjectMetaPath = this.getProjectMetadataRelativePath(
                targetUser.id,
                projectId,
            );

            // Conflict policy: keep authenticated local project if it already exists.
            if (await fileSystemService.exists(targetProjectMetaPath)) {
                skippedProjectIds.push(projectId);
                continue;
            }

            const guestProjectDto =
                await fileSystemService.readJson<Record<string, unknown>>(
                    guestProjectMetaPath,
                );

            if (guestProjectDto) {
                await fileSystemService.writeJson(targetProjectMetaPath, {
                    ...guestProjectDto,
                    userId: targetUser.id,
                });
            } else {
                await this.copyFileIfMissing(
                    this.toAbsolutePath(guestProjectMetaPath),
                    this.toAbsolutePath(targetProjectMetaPath),
                );
            }

            await this.copyDirectoryMerging(
                this.toAbsolutePath(
                    this.getProjectDirectoryRelativePath(
                        GUEST_USER_ID,
                        projectId,
                    ),
                ),
                this.toAbsolutePath(
                    this.getProjectDirectoryRelativePath(
                        targetUser.id,
                        projectId,
                    ),
                ),
            );

            migratedProjectIds.push(projectId);
        }

        await this.ensureTargetProfile(targetUser, migratedProjectIds);
        await this.discardGuestData();

        return {
            migratedProjectIds,
            skippedProjectIds,
        };
    }

    async discardGuestData(): Promise<void> {
        await fileSystemService.deleteDirectory(
            this.getUserRootRelativePath(GUEST_USER_ID),
        );
    }

    private async ensureTargetProfile(
        targetUser: User,
        migratedProjectIds: string[],
    ): Promise<void> {
        const existing = await this.localUserRepository.findById(targetUser.id);
        const profile = existing ?? targetUser;
        const projectIds = new Set<string>([
            ...profile.projectIds,
            ...migratedProjectIds,
        ]);

        profile.projectIds = Array.from(projectIds);
        profile.updatedAt = new Date();

        if (existing) {
            await this.localUserRepository.update(profile);
        } else {
            await this.localUserRepository.create(profile);
        }
    }

    private async listGuestProjectIds(): Promise<string[]> {
        const files = await fileSystemService.listFiles(
            this.getProjectsDirectoryRelativePath(GUEST_USER_ID),
        );

        return files
            .filter((fileName) => fileName.endsWith(".json"))
            .map((fileName) => fileName.slice(0, -5));
    }

    private getUserRootRelativePath(userId: string): string {
        return path.join("users", userId);
    }

    private getProjectsDirectoryRelativePath(userId: string): string {
        return path.join("users", userId, "projects");
    }

    private getProjectMetadataRelativePath(
        userId: string,
        projectId: string,
    ): string {
        return path.join("users", userId, "projects", `${projectId}.json`);
    }

    private getProjectDirectoryRelativePath(
        userId: string,
        projectId: string,
    ): string {
        return path.join("users", userId, "projects", projectId);
    }

    private toAbsolutePath(relativePath: string): string {
        return path.join(fileSystemService.getBasePath(), relativePath);
    }

    private async copyDirectoryMerging(
        sourceDir: string,
        targetDir: string,
    ): Promise<void> {
        if (!(await this.pathExists(sourceDir))) {
            return;
        }

        await fs.mkdir(targetDir, { recursive: true });
        const entries = await fs.readdir(sourceDir, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(sourceDir, entry.name);
            const targetPath = path.join(targetDir, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectoryMerging(sourcePath, targetPath);
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            await this.copyFileIfMissing(sourcePath, targetPath);
        }
    }

    private async copyFileIfMissing(
        sourcePath: string,
        targetPath: string,
    ): Promise<void> {
        if (!(await this.pathExists(sourcePath))) {
            return;
        }

        if (await this.pathExists(targetPath)) {
            return;
        }

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.copyFile(sourcePath, targetPath);
    }

    private async pathExists(targetPath: string): Promise<boolean> {
        try {
            await fs.access(targetPath);
            return true;
        } catch {
            return false;
        }
    }
}
