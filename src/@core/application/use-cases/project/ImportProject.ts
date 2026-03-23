import * as fsPromises from "fs/promises";

import { IEpubImportService } from "../../../domain/services/IEpubImportService";
import { IProjectRepository } from "../../../domain/repositories/IProjectRepository";
import { IChapterRepository } from "../../../domain/repositories/IChapterRepository";
import { ITimelineRepository } from "../../../domain/repositories/ITimelineRepository";
import { IUserRepository } from "../../../domain/repositories/IUserRepository";
import { IStorageService } from "../../../domain/services/IStorageService";
import { IAssetRepository } from "../../../domain/repositories/IAssetRepository";
import { IMetafieldDefinitionRepository } from "../../../domain/repositories/IMetafieldDefinitionRepository";
import { IEditorTemplateRepository } from "../../../domain/repositories/IEditorTemplateRepository";
import { Project } from "../../../domain/entities/story/Project";
import { Chapter } from "../../../domain/entities/story/Chapter";
import { Timeline } from "../../../domain/entities/story/timeline/Timeline";
import { Image } from "../../../domain/entities/story/world/Image";
import { generateId } from "../../utils/id";
import { initializeDefaultEditorTemplates } from "./defaultEditorTemplateBootstrap";

export interface ImportProjectRequest {
    userId: string;
    filePath: string;
}

export interface ImportProjectResponse {
    projectId: string;
    title: string;
    chapterCount: number;
}

interface TiptapNode {
    type: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: unknown[];
    content?: TiptapNode[];
}

export class ImportProject {
    constructor(
        private readonly epubImportService: IEpubImportService,
        private readonly projectRepository: IProjectRepository,
        private readonly chapterRepository: IChapterRepository,
        private readonly timelineRepository: ITimelineRepository,
        private readonly userRepository: IUserRepository,
        private readonly storageService: IStorageService,
        private readonly assetRepository: IAssetRepository,
        private readonly metafieldDefinitionRepository: IMetafieldDefinitionRepository,
        private readonly editorTemplateRepository: IEditorTemplateRepository,
    ) {}

    async execute(
        request: ImportProjectRequest,
        onProgress?: (percent: number) => void,
    ): Promise<ImportProjectResponse> {
        const report = (pct: number) => onProgress?.(Math.round(pct));

        // 1. Read file from disk (main process has fs access)
        const fileBuffer = await fsPromises.readFile(request.filePath);
        report(2);

        // 2. Parse the EPUB (0–50% overall)
        const parsed = await this.epubImportService.parseEpub(
            fileBuffer.buffer.slice(
                fileBuffer.byteOffset,
                fileBuffer.byteOffset + fileBuffer.byteLength,
            ),
            (epubPct) => report(2 + epubPct * 0.48),
        );
        report(50);

        // 3. Create project
        const user = await this.userRepository.findById(request.userId);
        if (!user) {
            throw new Error("User not found.");
        }

        const now = new Date();
        const projectId = generateId();
        const mainTimelineId = generateId();
        const chapterIds: string[] = [];

        // 4. Upload cover image if present
        let coverImageId: string | null = null;
        if (parsed.coverImage) {
            const uploadResult = await this.storageService.uploadAsset(
                parsed.coverImage.data,
                {
                    scope: "project",
                    scopeId: projectId,
                    assetType: "image",
                    extension: mimeToExtension(parsed.coverImage.mimeType),
                },
            );
            const coverImg = new Image(
                generateId(),
                uploadResult.url,
                uploadResult.path,
                now,
                now,
            );
            await this.assetRepository.saveImage(projectId, coverImg);
            coverImageId = coverImg.id;
        }
        report(55);

        // 5. Create project first (must exist before chapters for RLS)
        const project = new Project(
            projectId,
            parsed.title,
            coverImageId,
            [], // chapterIds will be populated as chapters are created
            [],
            [],
            [],
            [],
            [mainTimelineId],
            now,
            now,
        );

        await this.projectRepository.create(request.userId, project);

        // 6. Create chapters with their images
        const totalChapters = parsed.chapters.length;

        for (let i = 0; i < totalChapters; i++) {
            const parsedChapter = parsed.chapters[i];
            const chapterId = generateId();
            chapterIds.push(chapterId);

            // Upload chapter images and replace placeholder IDs with URLs
            let content = parsedChapter.content as TiptapNode;
            if (parsedChapter.images.length > 0) {
                const imageUrlMap = new Map<string, string>();

                for (const img of parsedChapter.images) {
                    const uploadResult = await this.storageService.uploadAsset(
                        img.data,
                        {
                            scope: "chapter",
                            scopeId: chapterId,
                            assetType: "image",
                            extension: mimeToExtension(img.mimeType),
                        },
                    );

                    const imageEntity = new Image(
                        generateId(),
                        uploadResult.url,
                        uploadResult.path,
                        now,
                        now,
                    );
                    await this.assetRepository.saveImage(
                        projectId,
                        imageEntity,
                    );

                    imageUrlMap.set(
                        `__import_image__:${img.id}`,
                        uploadResult.url,
                    );
                }

                content = replacePlaceholderUrls(content, imageUrlMap);
            }

            const chapter = new Chapter(
                chapterId,
                parsedChapter.title,
                i, // order
                JSON.stringify(content),
                null, // eventId
                now,
                now,
            );

            await this.chapterRepository.create(projectId, chapter);

            // Progress: 55% – 92% across chapters
            report(55 + ((i + 1) / totalChapters) * 37);
        }

        // 7. Update project with chapter IDs and create timeline
        project.chapterIds = chapterIds;
        await this.projectRepository.update(project);

        const mainTimeline = new Timeline(
            mainTimelineId,
            projectId,
            "Main",
            "The primary timeline for this project",
            "CE",
            0,
            [],
            now,
            now,
        );

        await this.timelineRepository.create(projectId, mainTimeline);

        await initializeDefaultEditorTemplates(
            projectId,
            now,
            this.metafieldDefinitionRepository,
            this.editorTemplateRepository,
        );
        report(96);

        // 8. Update user's project list
        if (!user.projectIds.includes(projectId)) {
            user.projectIds.push(projectId);
            user.updatedAt = now;
            await this.userRepository.update(user);
        }
        report(100);

        return {
            projectId,
            title: parsed.title,
            chapterCount: chapterIds.length,
        };
    }
}

function mimeToExtension(mimeType: string): string {
    const map: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/svg+xml": "svg",
        "image/webp": "webp",
    };
    return map[mimeType] ?? "bin";
}

function replacePlaceholderUrls(
    node: TiptapNode,
    urlMap: Map<string, string>,
): TiptapNode {
    if (
        node.type === "image" &&
        typeof node.attrs?.src === "string" &&
        node.attrs.src.startsWith("__import_image__:")
    ) {
        const realUrl = urlMap.get(node.attrs.src);
        if (realUrl) {
            return {
                ...node,
                attrs: { ...node.attrs, src: realUrl },
            };
        }
    }

    if (node.content) {
        return {
            ...node,
            content: node.content.map((child) =>
                replacePlaceholderUrls(child, urlMap),
            ),
        };
    }

    return node;
}
