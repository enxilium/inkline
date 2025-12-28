import React from "react";
import { useAppStore } from "../../state/appStore";
import {
    OrganizationEditor,
    type OrganizationEditorValues,
} from "../workspace/OrganizationEditor";
import type { DocumentRef } from "../ui/ListInput";
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
        characters,
        chapters,
        scrapNotes,
        assets,
        activeDocument,
        updateOrganizationLocally,
        reloadActiveProject,
        saveOrganizationInfo,
        generateOrganizationImage,
        generateOrganizationSong,
        generateOrganizationPlaylist,
        importAsset,
        setActiveDocument,
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
                description: values.description.join("\n"),
                mission: values.mission.join("\n"),
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

    const availableDocuments: DocumentRef[] = React.useMemo(() => {
        const docs: DocumentRef[] = [];
        for (const ch of chapters) {
            docs.push({
                id: ch.id,
                name: ch.title || "Untitled Chapter",
                kind: "chapter",
            });
        }
        for (const sn of scrapNotes) {
            docs.push({
                id: sn.id,
                name: sn.title || "Untitled Note",
                kind: "scrapNote",
            });
        }
        for (const c of characters) {
            docs.push({
                id: c.id,
                name: c.name || "Untitled Character",
                kind: "character",
            });
        }
        for (const l of locations) {
            docs.push({
                id: l.id,
                name: l.name || "Untitled Location",
                kind: "location",
            });
        }
        for (const o of organizations) {
            if (o.id !== organizationId) {
                docs.push({
                    id: o.id,
                    name: o.name || "Untitled Organization",
                    kind: "organization",
                });
            }
        }
        return docs;
    }, [
        chapters,
        scrapNotes,
        characters,
        locations,
        organizations,
        organizationId,
    ]);

    const handleNavigateToDocument = React.useCallback(
        (ref: DocumentRef) => {
            setActiveDocument({ kind: ref.kind, id: ref.id });
        },
        [setActiveDocument]
    );

    if (!organization) {
        return <div className="empty-editor">Organization not found.</div>;
    }

    return (
        <OrganizationEditor
            organization={organization}
            locations={locations}
            gallerySources={gallerySources}
            songUrl={songUrl}
            availableDocuments={availableDocuments}
            onSubmit={handleSubmit}
            onNavigateToDocument={handleNavigateToDocument}
            onGeneratePortrait={handleGeneratePortrait}
            onImportPortrait={handleImportPortrait}
            onGenerateSong={handleGenerateSong}
            onImportSong={handleImportSong}
            onGeneratePlaylist={handleGeneratePlaylist}
            onImportPlaylist={handleImportPlaylist}
        />
    );
};
