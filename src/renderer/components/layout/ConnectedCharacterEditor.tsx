import React from "react";
import { useAppStore } from "../../state/appStore";
import {
    CharacterEditor,
    type CharacterEditorValues,
} from "../workspace/CharacterEditor";
import type { AutosaveStatus } from "../../types";
import type { DocumentRef } from "../ui/ListInput";

interface ConnectedCharacterEditorProps {
    characterId: string;
}

export const ConnectedCharacterEditor: React.FC<
    ConnectedCharacterEditorProps
> = ({ characterId }) => {
    const {
        projectId,
        chapters,
        characters,
        locations,
        organizations,
        scrapNotes,
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
        setActiveDocument,
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
            if (c.id !== characterId) {
                docs.push({
                    kind: "character",
                    id: c.id,
                    name: c.name || "Untitled Character",
                });
            }
        });

        locations.forEach((loc) => {
            docs.push({
                kind: "location",
                id: loc.id,
                name: loc.name || "Untitled Location",
            });
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
        characterId,
    ]);

    const handleNavigateToDocument = React.useCallback(
        (ref: DocumentRef) => {
            setActiveDocument({ kind: ref.kind, id: ref.id });
        },
        [setActiveDocument]
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
                traits: values.traits,
                goals: values.goals,
                secrets: values.secrets,
                powers: values.powers,
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
            availableDocuments={availableDocuments}
            onSubmit={handleSubmit}
            onGeneratePortrait={handleGeneratePortrait}
            onImportPortrait={handleImportPortrait}
            onGenerateSong={handleGenerateSong}
            onImportSong={handleImportSong}
            onGeneratePlaylist={handleGeneratePlaylist}
            onImportPlaylist={handleImportPlaylist}
            onNavigateToDocument={handleNavigateToDocument}
        />
    );
};
