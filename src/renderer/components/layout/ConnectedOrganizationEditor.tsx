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
        metafieldDefinitions,
        metafieldAssignments,
        activeDocument,
        updateOrganizationLocally,
        addOrUpdateMetafieldDefinitionLocally,
        addOrUpdateMetafieldAssignmentLocally,
        updateMetafieldAssignmentLocally,
        removeMetafieldAssignmentLocally,
        removeMetafieldDefinitionLocally,
        reloadActiveProject,
        saveOrganizationInfo,
        createOrReuseMetafieldDefinition,
        assignMetafieldToEntity,
        saveMetafieldValue,
        removeMetafieldFromEntity,
        deleteMetafieldDefinitionGlobal,
        generateOrganizationImage,
        generateOrganizationSong,
        generateOrganizationPlaylist,
        importAsset,
        setActiveDocument,
        setAutosaveStatus: setGlobalAutosaveStatus,
        setAutosaveError: setGlobalAutosaveError,
        consumePendingTitleFocus,
    } = useAppStore();

    const [autosaveStatus, setAutosaveStatus] =
        React.useState<AutosaveStatus>("idle");
    const [focusTitleOnMount, setFocusTitleOnMount] = React.useState(false);

    const isActiveEditor =
        activeDocument?.kind === "organization" &&
        activeDocument.id === organizationId;

    React.useEffect(() => {
        if (isActiveEditor) {
            setGlobalAutosaveStatus(autosaveStatus);
        }
    }, [isActiveEditor, autosaveStatus, setGlobalAutosaveStatus]);

    React.useEffect(() => {
        if (!isActiveEditor) {
            return;
        }

        if (
            consumePendingTitleFocus({
                kind: "organization",
                id: organizationId,
            })
        ) {
            setFocusTitleOnMount(true);
        }
    }, [consumePendingTitleFocus, isActiveEditor, organizationId]);

    const organization = React.useMemo(
        () => organizations.find((o) => o.id === organizationId),
        [organizations, organizationId],
    );

    const resolveStoredImageUrls = React.useCallback(
        (galleryIds: string[]): string[] =>
            galleryIds
                .map((id) => assets.images[id]?.url)
                .filter((url): url is string => Boolean(url)),
        [assets.images],
    );

    const gallerySources = React.useMemo(
        () =>
            organization
                ? resolveStoredImageUrls(organization.galleryImageIds ?? [])
                : [],
        [organization, resolveStoredImageUrls],
    );

    const songUrl = React.useMemo(
        () =>
            organization?.bgmId
                ? assets.bgms[organization.bgmId]?.url
                : undefined,
        [organization, assets.bgms],
    );

    const imageOptions = React.useMemo(
        () =>
            Object.values(assets.images).map((image) => ({
                id: image.id,
                label: image.id.slice(0, 8),
            })),
        [assets.images],
    );

    const organizationMetafieldAssignments = React.useMemo(
        () =>
            metafieldAssignments.filter(
                (assignment) =>
                    assignment.entityType === "organization" &&
                    assignment.entityId === organizationId,
            ),
        [metafieldAssignments, organizationId],
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
                        prev === "saved" ? "idle" : prev,
                    );
                }, 2000);
            } catch (error) {
                setAutosaveStatus("error");
                setGlobalAutosaveError("Failed to save organization");
                updateOrganizationLocally(
                    organization.id,
                    originalOrganization,
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
        ],
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

    const handleCreateOrReuseMetafieldDefinition = React.useCallback(
        async (
            request: Parameters<typeof createOrReuseMetafieldDefinition>[0],
        ) => {
            const response = await createOrReuseMetafieldDefinition(request);
            addOrUpdateMetafieldDefinitionLocally(response.definition);
            return response;
        },
        [
            createOrReuseMetafieldDefinition,
            addOrUpdateMetafieldDefinitionLocally,
        ],
    );

    const handleAssignMetafieldToEntity = React.useCallback(
        async (request: Parameters<typeof assignMetafieldToEntity>[0]) => {
            const response = await assignMetafieldToEntity(request);
            addOrUpdateMetafieldAssignmentLocally(response.assignment);
            return response;
        },
        [assignMetafieldToEntity, addOrUpdateMetafieldAssignmentLocally],
    );

    const handleSaveMetafieldValue = React.useCallback(
        async (request: Parameters<typeof saveMetafieldValue>[0]) => {
            const original = organizationMetafieldAssignments.find(
                (item) => item.id === request.assignmentId,
            );

            updateMetafieldAssignmentLocally(request.assignmentId, {
                valueJson: request.value,
                ...(request.orderIndex !== undefined
                    ? { orderIndex: request.orderIndex }
                    : {}),
                updatedAt: new Date(),
            });

            try {
                await saveMetafieldValue(request);
            } catch (error) {
                if (original) {
                    updateMetafieldAssignmentLocally(request.assignmentId, {
                        valueJson: original.valueJson,
                        orderIndex: original.orderIndex,
                        updatedAt: original.updatedAt,
                    });
                }
                throw error;
            }
        },
        [
            organizationMetafieldAssignments,
            saveMetafieldValue,
            updateMetafieldAssignmentLocally,
        ],
    );

    const handleRemoveMetafieldFromEntity = React.useCallback(
        async (request: Parameters<typeof removeMetafieldFromEntity>[0]) => {
            const existing = organizationMetafieldAssignments.find(
                (assignment) =>
                    assignment.definitionId === request.definitionId,
            );

            await removeMetafieldFromEntity(request);

            if (existing) {
                removeMetafieldAssignmentLocally(existing.id);
            }
        },
        [
            organizationMetafieldAssignments,
            removeMetafieldFromEntity,
            removeMetafieldAssignmentLocally,
        ],
    );

    const handleDeleteMetafieldDefinitionGlobal = React.useCallback(
        async (
            request: Parameters<typeof deleteMetafieldDefinitionGlobal>[0],
        ) => {
            await deleteMetafieldDefinitionGlobal(request);
            removeMetafieldDefinitionLocally(request.definitionId);
        },
        [deleteMetafieldDefinitionGlobal, removeMetafieldDefinitionLocally],
    );

    const handleImportMetafieldImage = React.useCallback(
        async (file: File): Promise<string> => {
            if (!projectId || !organization) {
                throw new Error("Project or organization is missing.");
            }

            const buffer = await file.arrayBuffer();
            const extension = file.name.split(".").pop();
            const response = await importAsset({
                projectId,
                payload: {
                    kind: "image",
                    subjectType: "organization",
                    subjectId: organization.id,
                    fileData: buffer,
                    extension,
                },
            });

            if (response.kind !== "image") {
                throw new Error("Imported asset is not an image.");
            }

            return response.image.id;
        },
        [importAsset, organization, projectId],
    );

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
        [setActiveDocument],
    );

    if (!organization) {
        return <div className="empty-editor">Organization not found.</div>;
    }

    return (
        <OrganizationEditor
            projectId={projectId}
            organization={organization}
            locations={locations}
            allCharacters={characters}
            allLocations={locations}
            allOrganizations={organizations}
            metafieldDefinitions={metafieldDefinitions}
            metafieldAssignments={organizationMetafieldAssignments}
            imageOptions={imageOptions}
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
            onCreateOrReuseMetafieldDefinition={
                handleCreateOrReuseMetafieldDefinition
            }
            onAssignMetafieldToEntity={handleAssignMetafieldToEntity}
            onSaveMetafieldValue={handleSaveMetafieldValue}
            onRemoveMetafieldFromEntity={handleRemoveMetafieldFromEntity}
            onDeleteMetafieldDefinitionGlobal={
                handleDeleteMetafieldDefinitionGlobal
            }
            onImportMetafieldImage={handleImportMetafieldImage}
            focusTitleOnMount={focusTitleOnMount}
        />
    );
};
