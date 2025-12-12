import React from "react";
import { useAppStore } from "../../state/appStore";
import { ensureRendererApi } from "../../utils/api";
import { LocationEditor, type LocationEditorValues } from "../workspace/LocationEditor";

const rendererApi = ensureRendererApi();

interface ConnectedLocationEditorProps {
    locationId: string;
}

const listFromMultiline = (value: string): string[] =>
    value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

export const ConnectedLocationEditor: React.FC<ConnectedLocationEditorProps> = ({
    locationId,
}) => {
    const {
        projectId,
        locations,
        assets,
        updateLocationLocally,
        reloadActiveProject,
    } = useAppStore();

    const location = React.useMemo(
        () => locations.find((l) => l.id === locationId),
        [locations, locationId]
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
            location
                ? resolveStoredImageUrls(location.galleryImageIds ?? [])
                : [],
        [location, resolveStoredImageUrls]
    );

    const songUrl = React.useMemo(
        () =>
            location?.bgmId
                ? assets.bgms[location.bgmId]?.url
                : undefined,
        [location, assets.bgms]
    );

    const handleSubmit = React.useCallback(
        async (values: LocationEditorValues) => {
            if (!location || !projectId) return;

            const payload = {
                name: values.name,
                description: values.description,
                culture: values.culture,
                history: values.history,
                conflicts: listFromMultiline(values.conflicts),
                tags: values.tags,
            };

            const originalLocation = { ...location };
            updateLocationLocally(location.id, {
                ...payload,
                updatedAt: new Date(),
            });

            try {
                await rendererApi.logistics.saveLocationInfo({
                    locationId: location.id,
                    payload,
                });
            } catch (error) {
                updateLocationLocally(location.id, originalLocation);
                await reloadActiveProject();
                throw error;
            }
        },
        [location, projectId, updateLocationLocally, reloadActiveProject]
    );

    const handleGeneratePortrait = async () => {
        if (!projectId || !location) return;
        await rendererApi.generation.generateLocationImage({
            projectId,
            locationId: location.id,
        });
        await reloadActiveProject();
    };

    const handleImportPortrait = async (file: File) => {
        if (!projectId || !location) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await rendererApi.asset.importAsset({
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
        await rendererApi.generation.generateLocationSong({
            projectId,
            locationId: location.id,
        });
        await reloadActiveProject();
    };

    const handleImportSong = async (file: File) => {
        if (!projectId || !location) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await rendererApi.asset.importAsset({
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
        await rendererApi.generation.generateLocationPlaylist({
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

        await rendererApi.asset.importAsset({
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

    return (
        <LocationEditor
            location={location}
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
