import React from "react";
import { useAppStore } from "../../state/appStore";
import {
    OrganizationEditor,
    type OrganizationEditorValues,
} from "../workspace/OrganizationEditor";
import type { AutosaveStatus } from "../../types";

interface ConnectedOrganizationEditorProps {
    organizationId: string;
}

export const ConnectedOrganizationEditor: React.FC<
    ConnectedOrganizationEditorProps
> = ({ organizationId }) => {
    const {
        projectId,
        organizations,
        locations,
        assets,
        activeDocument,
        updateOrganizationLocally,
        reloadActiveProject,
        saveOrganizationInfo,
        generateOrganizationImage,
        generateOrganizationSong,
        generateOrganizationPlaylist,
        importAsset,
        setAutosaveStatus: setGlobalAutosaveStatus,
        setAutosaveError: setGlobalAutosaveError,
    } = useAppStore();

    const [autosaveStatus, setAutosaveStatus] =
        React.useState<AutosaveStatus>("idle");

    const isActiveEditor =
        activeDocument?.kind === "organization" &&
        activeDocument.id === organizationId;

    React.useEffect(() => {
        if (isActiveEditor) {
            setGlobalAutosaveStatus(autosaveStatus);
        }
    }, [isActiveEditor, autosaveStatus, setGlobalAutosaveStatus]);

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

            setAutosaveStatus("saving");

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
                await saveOrganizationInfo({
                    organizationId: organization.id,
                    payload,
                });
                setAutosaveStatus("saved");
                setTimeout(() => {
                    setAutosaveStatus((prev) =>
                        prev === "saved" ? "idle" : prev
                    );
                }, 2000);
            } catch (error) {
                setAutosaveStatus("error");
                setGlobalAutosaveError("Failed to save organization");
                updateOrganizationLocally(
                    organization.id,
                    originalOrganization
                );
                await reloadActiveProject();
                throw error;
            }
        },
        [
            organization,
            projectId,
            updateOrganizationLocally,
            reloadActiveProject,
            saveOrganizationInfo,
            setGlobalAutosaveError,
        ]
    );

    const handleGeneratePortrait = async () => {
        if (!projectId || !organization) return;
        await generateOrganizationImage({
            projectId,
            organizationId: organization.id,
        });
        await reloadActiveProject();
    };

    const handleImportPortrait = async (file: File) => {
        if (!projectId || !organization) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await importAsset({
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
        await generateOrganizationSong({
            projectId,
            organizationId: organization.id,
        });
        await reloadActiveProject();
    };

    const handleImportSong = async (file: File) => {
        if (!projectId || !organization) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await importAsset({
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
        await generateOrganizationPlaylist({
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

        await importAsset({
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
