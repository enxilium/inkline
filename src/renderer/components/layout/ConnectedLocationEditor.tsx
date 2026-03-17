import React from "react";
import { useAppStore } from "../../state/appStore";
import {
    LocationEditor,
    type LocationEditorValues,
} from "../workspace/LocationEditor";
import type { AutosaveStatus } from "../../types";
import type { DocumentRef } from "../ui/ListInput";
import type { SelectOption } from "../ui/SearchableSelect";

interface ConnectedLocationEditorProps {
    locationId: string;
}

export const ConnectedLocationEditor: React.FC<
    ConnectedLocationEditorProps
> = ({ locationId }) => {
    const {
        projectId,
        chapters,
        characters,
        locations,
        organizations,
        scrapNotes,
        assets,
        activeDocument,
        updateLocationLocally,
        reloadActiveProject,
        saveLocationInfo,
        generateLocationImage,
        generateLocationSong,
        generateLocationPlaylist,
        importAsset,
        setAutosaveStatus: setGlobalAutosaveStatus,
        setAutosaveError: setGlobalAutosaveError,
        setActiveDocument,
        consumePendingTitleFocus,
    } = useAppStore();

    const [autosaveStatus, setAutosaveStatus] =
        React.useState<AutosaveStatus>("idle");
    const [focusTitleOnMount, setFocusTitleOnMount] = React.useState(false);

    const isActiveEditor =
        activeDocument?.kind === "location" && activeDocument.id === locationId;

    React.useEffect(() => {
        if (isActiveEditor) {
            setGlobalAutosaveStatus(autosaveStatus);
        }
    }, [isActiveEditor, autosaveStatus, setGlobalAutosaveStatus]);

    React.useEffect(() => {
        if (!isActiveEditor) {
            return;
        }

        if (consumePendingTitleFocus({ kind: "location", id: locationId })) {
            setFocusTitleOnMount(true);
        }
    }, [consumePendingTitleFocus, isActiveEditor, locationId]);

    const location = React.useMemo(
        () => locations.find((l) => l.id === locationId),
        [locations, locationId],
    );

    const parentLocationId = React.useMemo(() => {
        for (const candidate of locations) {
            if (candidate.sublocationIds.includes(locationId)) {
                return candidate.id;
            }
        }

        return null;
    }, [locations, locationId]);

    const parentOptions = React.useMemo((): SelectOption[] => {
        const descendants = new Set<string>();
        const stack = [locationId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            if (!currentId || descendants.has(currentId)) {
                continue;
            }

            descendants.add(currentId);
            const current = locations.find((entry) => entry.id === currentId);
            if (!current) {
                continue;
            }

            current.sublocationIds.forEach((childId) => {
                stack.push(childId);
            });
        }

        return locations
            .filter((entry) => !descendants.has(entry.id))
            .map((entry) => ({
                id: entry.id,
                label: entry.name || "Untitled Location",
            }));
    }, [locationId, locations]);

    const resolveStoredImageUrls = React.useCallback(
        (galleryIds: string[]): string[] =>
            galleryIds
                .map((id) => assets.images[id]?.url)
                .filter((url): url is string => Boolean(url)),
        [assets.images],
    );

    const gallerySources = React.useMemo(
        () =>
            location
                ? resolveStoredImageUrls(location.galleryImageIds ?? [])
                : [],
        [location, resolveStoredImageUrls],
    );

    const songUrl = React.useMemo(
        () => (location?.bgmId ? assets.bgms[location.bgmId]?.url : undefined),
        [location, assets.bgms],
    );

    const handleSubmit = React.useCallback(
        async (values: LocationEditorValues) => {
            if (!location || !projectId) return;

            setAutosaveStatus("saving");

            const payload = {
                name: values.name,
                parentLocationId: values.parentLocationId || null,
                description: values.description,
                culture: values.culture,
                history: values.history,
                conflicts: values.conflicts,
                tags: values.tags,
            };

            const originalLocation = { ...location };
            updateLocationLocally(location.id, {
                ...payload,
                updatedAt: new Date(),
            });

            try {
                await saveLocationInfo({
                    projectId,
                    locationId: location.id,
                    payload,
                });

                if (
                    (parentLocationId ?? null) !==
                    (payload.parentLocationId ?? null)
                ) {
                    await reloadActiveProject();
                }

                setAutosaveStatus("saved");
                setTimeout(() => {
                    setAutosaveStatus((prev) =>
                        prev === "saved" ? "idle" : prev,
                    );
                }, 2000);
            } catch (error) {
                setAutosaveStatus("error");
                setGlobalAutosaveError("Failed to save location");
                updateLocationLocally(location.id, originalLocation);
                await reloadActiveProject();
                throw error;
            }
        },
        [
            location,
            parentLocationId,
            projectId,
            updateLocationLocally,
            reloadActiveProject,
            saveLocationInfo,
            setGlobalAutosaveError,
        ],
    );

    const handleGeneratePortrait = async () => {
        if (!projectId || !location) return;
        await generateLocationImage({
            projectId,
            locationId: location.id,
        });
        await reloadActiveProject();
    };

    const handleImportPortrait = async (file: File) => {
        if (!projectId || !location) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await importAsset({
            projectId,
            payload: {
                kind: "image",
                subjectType: "location",
                subjectId: location.id,
                fileData: buffer,
                extension,
            },
        });
        await reloadActiveProject();
    };

    const handleGenerateSong = async () => {
        if (!projectId || !location) return;
        await generateLocationSong({
            projectId,
            locationId: location.id,
        });
        await reloadActiveProject();
    };

    const handleImportSong = async (file: File) => {
        if (!projectId || !location) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await importAsset({
            projectId,
            payload: {
                kind: "bgm",
                subjectType: "location",
                subjectId: location.id,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: "Imported",
                fileData: buffer,
                extension,
            },
        });
        await reloadActiveProject();
    };

    const handleGeneratePlaylist = async () => {
        if (!projectId || !location) return;
        await generateLocationPlaylist({
            projectId,
            locationId: location.id,
        });
        await reloadActiveProject();
    };

    const handleImportPlaylist = async (file: File) => {
        if (!projectId || !location) return;
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
                subjectType: "location",
                subjectId: location.id,
            },
        });
        await reloadActiveProject();
    };

    if (!location) {
        return <div className="empty-editor">Location not found.</div>;
    }

    // Build available documents for slash-command references
    const availableDocuments: DocumentRef[] = React.useMemo(() => {
        const docs: DocumentRef[] = [];

        chapters.forEach((ch) => {
            docs.push({
                kind: "chapter",
                id: ch.id,
                name: ch.title || `Chapter ${ch.order}`,
            });
        });

        scrapNotes.forEach((sn) => {
            docs.push({
                kind: "scrapNote",
                id: sn.id,
                name: sn.title || "Untitled Note",
            });
        });

        characters.forEach((c) => {
            docs.push({
                kind: "character",
                id: c.id,
                name: c.name || "Untitled Character",
            });
        });

        locations.forEach((loc) => {
            if (loc.id !== locationId) {
                docs.push({
                    kind: "location",
                    id: loc.id,
                    name: loc.name || "Untitled Location",
                });
            }
        });

        organizations.forEach((org) => {
            docs.push({
                kind: "organization",
                id: org.id,
                name: org.name || "Untitled Organization",
            });
        });

        return docs;
    }, [
        chapters,
        scrapNotes,
        characters,
        locations,
        organizations,
        locationId,
    ]);

    const handleNavigateToDocument = React.useCallback(
        (ref: DocumentRef) => {
            setActiveDocument({ kind: ref.kind, id: ref.id });
        },
        [setActiveDocument],
    );

    return (
        <LocationEditor
            location={location}
            parentOptions={parentOptions}
            currentParentLocationId={parentLocationId}
            gallerySources={gallerySources}
            songUrl={songUrl}
            availableDocuments={availableDocuments}
            onSubmit={handleSubmit}
            onGeneratePortrait={handleGeneratePortrait}
            onImportPortrait={handleImportPortrait}
            onGenerateSong={handleGenerateSong}
            onImportSong={handleImportSong}
            onGeneratePlaylist={handleGeneratePlaylist}
            onImportPlaylist={handleImportPlaylist}
            onNavigateToDocument={handleNavigateToDocument}
            focusTitleOnMount={focusTitleOnMount}
        />
    );
};
