import { IOrganizationRepository } from "../../../@core/domain/repositories/IOrganizationRepository";
import { Organization } from "../../../@core/domain/entities/story/world/Organization";
import { fileSystemService } from "../../storage/FileSystemService";
import * as path from "path";

type FileSystemOrganization = {
    id: string;
    projectId: string;
    name: string;
    description: string;
    mission: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    bgmId: string | null;
    playlistId: string | null;
    galleryImageIds: string[];
    locationIds: string[];
};

export class FileSystemOrganizationRepository
    implements IOrganizationRepository
{
    private getFilePath(
        userId: string,
        projectId: string,
        orgId: string
    ): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "organizations",
            `${orgId}.json`
        );
    }

    private getDirectoryPath(userId: string, projectId: string): string {
        return path.join(
            "users",
            userId,
            "projects",
            projectId,
            "organizations"
        );
    }

    async create(projectId: string, organization: Organization): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;

        const dto: FileSystemOrganization = {
            id: organization.id,
            projectId: projectId,
            name: organization.name,
            description: organization.description,
            mission: organization.mission,
            tags: organization.tags,
            createdAt: organization.createdAt.toISOString(),
            updatedAt: organization.updatedAt.toISOString(),
            bgmId: organization.bgmId,
            playlistId: organization.playlistId,
            galleryImageIds: organization.galleryImageIds,
            locationIds: organization.locationIds,
        };
        await fileSystemService.writeJson(
            this.getFilePath(ownerId, projectId, organization.id),
            dto
        );
    }

    async findById(id: string): Promise<Organization | null> {
        const loc = await this.findFileLocation(id);
        if (loc) {
            const dto =
                await fileSystemService.readJson<FileSystemOrganization>(
                    loc.path
                );
            if (dto) return this.mapToEntity(dto);
        }
        return null;
    }

    async findByProjectId(projectId: string): Promise<Organization[]> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return [];

        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        const orgs: Organization[] = [];

        for (const file of files) {
            if (file.endsWith(".json")) {
                const dto =
                    await fileSystemService.readJson<FileSystemOrganization>(
                        path.join(dirPath, file)
                    );
                if (dto) orgs.push(this.mapToEntity(dto));
            }
        }
        return orgs;
    }

    async findByLocationId(locationId: string): Promise<Organization[]> {
        // Inefficient scan, but necessary for FS implementation without index
        // We need to scan all projects for the current user.
        // Since we don't have the user ID here, we rely on findFileLocation to find *any* file,
        // but that requires an ID.
        // We can list all users/projects.

        const users = await fileSystemService.listFiles("users");
        const results: Organization[] = [];

        for (const userId of users) {
            const projectsPath = path.join("users", userId, "projects");
            const projects = await fileSystemService.listFiles(projectsPath);

            for (const projectId of projects) {
                const orgs = await this.findByProjectId(projectId);
                for (const org of orgs) {
                    if (org.locationIds.includes(locationId)) {
                        results.push(org);
                    }
                }
            }
        }
        return results;
    }

    async getOrganizationProfiles(
        projectId: string
    ): Promise<{ id: string; name: string; description: string }[]> {
        const orgs = await this.findByProjectId(projectId);
        return orgs.map((o) => ({
            id: o.id,
            name: o.name,
            description: o.description,
        }));
    }

    async update(organization: Organization): Promise<void> {
        const loc = await this.findFileLocation(organization.id);
        if (loc) {
            const dto: FileSystemOrganization = {
                id: organization.id,
                projectId: loc.projectId,
                name: organization.name,
                description: organization.description,
                mission: organization.mission,
                tags: organization.tags,
                createdAt: organization.createdAt.toISOString(),
                updatedAt: organization.updatedAt.toISOString(),
                bgmId: organization.bgmId,
                playlistId: organization.playlistId,
                galleryImageIds: organization.galleryImageIds,
                locationIds: organization.locationIds,
            };
            await fileSystemService.writeJson(loc.path, dto);
        }
    }

    async delete(id: string): Promise<void> {
        const loc = await this.findFileLocation(id);
        if (loc) await fileSystemService.deleteFile(loc.path);
    }

    async deleteByProjectId(projectId: string): Promise<void> {
        const ownerId = await this.findOwnerIdByProjectId(projectId);
        if (!ownerId) return;
        const dirPath = this.getDirectoryPath(ownerId, projectId);
        const files = await fileSystemService.listFiles(dirPath);
        for (const file of files) {
            await fileSystemService.deleteFile(path.join(dirPath, file));
        }
    }

    private async findOwnerIdByProjectId(
        projectId: string
    ): Promise<string | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectPath = path.join(
                "users",
                user,
                "projects",
                `${projectId}.json`
            );
            if (await fileSystemService.exists(projectPath)) {
                return user;
            }
        }
        return null;
    }

    private async findFileLocation(
        orgId: string
    ): Promise<{ userId: string; projectId: string; path: string } | null> {
        const users = await fileSystemService.listFiles("users");
        for (const user of users) {
            const projectsDir = path.join("users", user, "projects");
            const projects = await fileSystemService.listFiles(projectsDir);
            for (const projectFile of projects) {
                if (projectFile.endsWith(".json")) {
                    const projectId = projectFile.replace(".json", "");
                    const orgPath = this.getFilePath(user, projectId, orgId);
                    if (await fileSystemService.exists(orgPath)) {
                        return { userId: user, projectId, path: orgPath };
                    }
                }
            }
        }
        return null;
    }

    private mapToEntity(dto: FileSystemOrganization): Organization {
        return new Organization(
            dto.id,
            dto.name,
            dto.description,
            dto.mission,
            dto.tags,
            dto.locationIds,
            dto.galleryImageIds,
            dto.playlistId,
            dto.bgmId,
            new Date(dto.createdAt),
            new Date(dto.updatedAt)
        );
    }
}
