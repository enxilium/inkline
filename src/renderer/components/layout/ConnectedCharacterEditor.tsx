import React from "react";
import { useAppStore } from "../../state/appStore";
import { ensureRendererApi } from "../../utils/api";
import { CharacterEditor, type CharacterEditorValues } from "../workspace/CharacterEditor";

const rendererApi = ensureRendererApi();

interface ConnectedCharacterEditorProps {
    characterId: string;
}

const listFromMultiline = (value: string): string[] =>
    value
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

export const ConnectedCharacterEditor: React.FC<ConnectedCharacterEditorProps> = ({
    characterId,
}) => {
    const {
        projectId,
        characters,
        locations,
        organizations,
        assets,
        updateCharacterLocally,
        reloadActiveProject,
    } = useAppStore();

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
            character?.bgmId
                ? assets.bgms[character.bgmId]?.url
                : undefined,
        [character, assets.bgms]
    );

    const handleSubmit = React.useCallback(
        async (values: CharacterEditorValues) => {
            if (!character || !projectId) return;

            const payload = {
                name: values.name,
                race: values.race,
                age: values.age ? Number(values.age) : null,
                description: values.description,
                traits: listFromMultiline(values.traits),
                goals: listFromMultiline(values.goals),
                secrets: listFromMultiline(values.secrets),
                quote: values.quote,
                tags: listFromMultiline(values.tags),
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
                await rendererApi.logistics.saveCharacterInfo({
                    projectId,
                    characterId: character.id,
                    payload,
                });
            } catch (error) {
                updateCharacterLocally(character.id, originalCharacter);
                await reloadActiveProject();
                throw error;
            }
        },
        [character, projectId, updateCharacterLocally, reloadActiveProject]
    );

    // Handlers
    const handleGeneratePortrait = async () => {
        if (!projectId || !character) return;
        await rendererApi.generation.generateCharacterImage({
            projectId,
            characterId: character.id,
        });
        await reloadActiveProject();
    };

    const handleImportPortrait = async (file: File) => {
        if (!projectId || !character) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await rendererApi.asset.importAsset({
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

    const handleGenerateVoice = async () => {
        if (!projectId || !character) return;
        await rendererApi.generation.generateCharacterVoice({
            projectId,
            characterId: character.id,
        });
        await reloadActiveProject();
    };

    const handleImportVoice = async (file: File) => {
        if (!projectId || !character) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await rendererApi.asset.importAsset({
            projectId,
            payload: {
                kind: "voice",
                characterId: character.id,
                fileData: buffer,
                extension,
            },
        });
        await reloadActiveProject();
    };

    const handleGenerateQuote = async (quote: string) => {
        if (!projectId || !character) return;
        await rendererApi.generation.generateCharacterQuote({
            projectId,
            characterId: character.id,
            quote,
        });
        await reloadActiveProject();
    };

    const handleGenerateSong = async () => {
        if (!projectId || !character) return;
        await rendererApi.generation.generateCharacterSong({
            projectId,
            characterId: character.id,
        });
        await reloadActiveProject();
    };

    const handleImportSong = async (file: File) => {
        if (!projectId || !character) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        await rendererApi.asset.importAsset({
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
        await rendererApi.generation.generateCharacterPlaylist({
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

        await rendererApi.asset.importAsset({
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
            onGenerateVoice={handleGenerateVoice}
            onImportVoice={handleImportVoice}
            onGenerateQuote={handleGenerateQuote}
            onGenerateSong={handleGenerateSong}
            onImportSong={handleImportSong}
            onGeneratePlaylist={handleGeneratePlaylist}
            onImportPlaylist={handleImportPlaylist}
        />
    );
};
