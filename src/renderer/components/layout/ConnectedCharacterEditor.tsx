import React from "react";
import { useAppStore } from "../../state/appStore";
import {
    CharacterEditor,
    type CharacterEditorValues,
} from "../workspace/CharacterEditor";
import type { AutosaveStatus } from "../../types";

interface ConnectedCharacterEditorProps {
    characterId: string;
}

const listFromMultiline = (value: string): string[] =>
    value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

export const ConnectedCharacterEditor: React.FC<
    ConnectedCharacterEditorProps
> = ({ characterId }) => {
    const {
        projectId,
        characters,
        locations,
        organizations,
        assets,
        activeDocument,
        updateCharacterLocally,
        reloadActiveProject,
        saveCharacterInfo,
        generateCharacterImage,
        generateCharacterSong,
        generateCharacterPlaylist,
        importAsset,
        setAutosaveStatus: setGlobalAutosaveStatus,
        setAutosaveError: setGlobalAutosaveError,
    } = useAppStore();

    const [autosaveStatus, setAutosaveStatus] =
        React.useState<AutosaveStatus>("idle");

    const isActiveEditor =
        activeDocument?.kind === "character" &&
        activeDocument.id === characterId;

    React.useEffect(() => {
        if (isActiveEditor) {
            setGlobalAutosaveStatus(autosaveStatus);
        }
    }, [isActiveEditor, autosaveStatus, setGlobalAutosaveStatus]);

    const character = React.useMemo(
        () => characters.find((c) => c.id === characterId),
        [characters, characterId]
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
            character
                ? resolveStoredImageUrls(character.galleryImageIds ?? [])
                : [],
        [character, resolveStoredImageUrls]
    );

    const songUrl = React.useMemo(
        () =>
            character?.bgmId ? assets.bgms[character.bgmId]?.url : undefined,
        [character, assets.bgms]
    );

    const handleSubmit = React.useCallback(
        async (values: CharacterEditorValues) => {
            if (!character || !projectId) return;

            setAutosaveStatus("saving");

            const payload = {
                name: values.name,
                race: values.race,
                age: values.age ? Number(values.age) : null,
                description: values.description,
                traits: listFromMultiline(values.traits),
                goals: listFromMultiline(values.goals),
                secrets: listFromMultiline(values.secrets),
                tags: values.tags,
                currentLocationId: values.currentLocationId || null,
                backgroundLocationId: values.backgroundLocationId || null,
                organizationId: values.organizationId || null,
            };

            // Optimistic update
            const originalCharacter = { ...character };
            updateCharacterLocally(character.id, {
                ...payload,
                updatedAt: new Date(),
            });

            try {
                await saveCharacterInfo({
                    characterId: character.id,
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
                setGlobalAutosaveError("Failed to save character");
                updateCharacterLocally(character.id, originalCharacter);
                await reloadActiveProject();
                throw error;
            }
        },
        [
            character,
            projectId,
            updateCharacterLocally,
            reloadActiveProject,
            saveCharacterInfo,
            setGlobalAutosaveError,
        ]
    );

    // Handlers
    const handleGeneratePortrait = async () => {
        if (!projectId || !character) return;
        await generateCharacterImage({
            projectId,
            characterId: character.id,
        });
        await reloadActiveProject();
    };

    const handleImportPortrait = async (file: File) => {
        if (!projectId || !character) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await importAsset({
            projectId,
            payload: {
                kind: "image",
                subjectType: "character",
                subjectId: character.id,
                fileData: buffer,
                extension,
            },
        });
        await reloadActiveProject();
    };

    const handleGenerateSong = async () => {
        if (!projectId || !character) return;
        await generateCharacterSong({
            projectId,
            characterId: character.id,
        });
        await reloadActiveProject();
    };

    const handleImportSong = async (file: File) => {
        if (!projectId || !character) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await importAsset({
            projectId,
            payload: {
                kind: "bgm",
                subjectType: "character",
                subjectId: character.id,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: "Imported",
                fileData: buffer,
                extension,
            },
        });
        await reloadActiveProject();
    };

    const handleGeneratePlaylist = async () => {
        if (!projectId || !character) return;
        await generateCharacterPlaylist({
            projectId,
            characterId: character.id,
        });
        await reloadActiveProject();
    };

    const handleImportPlaylist = async (file: File) => {
        if (!projectId || !character) return;
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
                subjectType: "character",
                subjectId: character.id,
            },
        });
        await reloadActiveProject();
    };

    if (!character) {
        return <div className="empty-editor">Character not found.</div>;
    }

    return (
        <CharacterEditor
            character={character}
            locations={locations}
            organizations={organizations}
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
