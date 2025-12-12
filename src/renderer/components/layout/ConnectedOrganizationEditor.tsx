import React from "react";
import { useAppStore } from "../../state/appStore";
import { ensureRendererApi } from "../../utils/api";
import { OrganizationEditor, type OrganizationEditorValues } from "../workspace/OrganizationEditor";

const rendererApi = ensureRendererApi();

interface ConnectedOrganizationEditorProps {
    organizationId: string;
}

const listFromMultiline = (value: string): string[] =>
    value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

export const ConnectedOrganizationEditor: React.FC<ConnectedOrganizationEditorProps> = ({
    organizationId,
}) => {
    const {
        projectId,
        organizations,
        locations,
        assets,
        updateOrganizationLocally,
        reloadActiveProject,
    } = useAppStore();

    const organization = React.useMemo(
        () => organizations.find((o) => o.id === organizationId),
        [organizations, organizationId]
    );

    const resolveStoredImageUrls = React.useCallback(
        (galleryIds: string[]): string[] =>
            galleryIds
                .map((id) => assets.images[id]?.url)
                .filter((url): url is string => Boolean(url)),
        [assets.images]
    );

    const gallerySources = React.useMemo(
        () =>
            organization
                ? resolveStoredImageUrls(organization.galleryImageIds ?? [])
                : [],
        [organization, resolveStoredImageUrls]
    );

    const songUrl = React.useMemo(
        () =>
            organization?.bgmId
                ? assets.bgms[organization.bgmId]?.url
                : undefined,
        [organization, assets.bgms]
    );

    const handleSubmit = React.useCallback(
        async (values: OrganizationEditorValues) => {
            if (!organization || !projectId) return;

            const payload = {
                name: values.name,
                description: values.description,
                mission: values.mission,
                tags: values.tags,
                locationIds: values.locationIds,
            };

            const originalOrganization = { ...organization };
            updateOrganizationLocally(organization.id, {
                ...payload,
                updatedAt: new Date(),
            });

            try {
                await rendererApi.logistics.saveOrganizationInfo({
                    organizationId: organization.id,
                    payload,
                });
            } catch (error) {
                updateOrganizationLocally(organization.id, originalOrganization);
                await reloadActiveProject();
                throw error;
            }
        },
        [organization, projectId, updateOrganizationLocally, reloadActiveProject]
    );

    const handleGeneratePortrait = async () => {
        if (!projectId || !organization) return;
        await rendererApi.generation.generateOrganizationImage({
            projectId,
            organizationId: organization.id,
        });
        await reloadActiveProject();
    };

    const handleImportPortrait = async (file: File) => {
        if (!projectId || !organization) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await rendererApi.asset.importAsset({
            projectId,
            payload: {
                kind: "image",
                subjectType: "organization",
                subjectId: organization.id,
                fileData: buffer,
                extension,
            },
        });
        await reloadActiveProject();
    };

    const handleGenerateSong = async () => {
        if (!projectId || !organization) return;
        await rendererApi.generation.generateOrganizationSong({
            projectId,
            organizationId: organization.id,
        });
        await reloadActiveProject();
    };

    const handleImportSong = async (file: File) => {
        if (!projectId || !organization) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await rendererApi.asset.importAsset({
            projectId,
            payload: {
                kind: "bgm",
                subjectType: "organization",
                subjectId: organization.id,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: "Imported",
                fileData: buffer,
                extension,
            },
        });
        await reloadActiveProject();
    };

    const handleGeneratePlaylist = async () => {
        if (!projectId || !organization) return;
        await rendererApi.generation.generateOrganizationPlaylist({
            projectId,
            organizationId: organization.id,
        });
        await reloadActiveProject();
    };

    const handleImportPlaylist = async (file: File) => {
        if (!projectId || !organization) return;
        const text = await file.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            throw new Error("Invalid playlist JSON.");
        }

        await rendererApi.asset.importAsset({
            projectId,
            payload: {
                kind: "playlist",
                name: data.name || file.name.replace(".json", ""),
                description: data.description || "",
                tracks: data.tracks || [],
                url: "",
                subjectType: "organization",
                subjectId: organization.id,
            },
        });
        await reloadActiveProject();
    };

    if (!organization) {
        return <div className="empty-editor">Organization not found.</div>;
    }

    return (
        <OrganizationEditor
            organization={organization}
            locations={locations}
            gallerySources={gallerySources}
            songUrl={songUrl}
            onSubmit={handleSubmit}
            onGeneratePortrait={handleGeneratePortrait}
            onImportPortrait={handleImportPortrait}
            onGenerateSong={handleGenerateSong}
            onImportSong={handleImportSong}
            onGeneratePlaylist={handleGeneratePlaylist}
            onImportPlaylist={handleImportPlaylist}
        />
    );
};
