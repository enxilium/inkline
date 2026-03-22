import React from "react";
import { useAppStore } from "../../state/appStore";
import {
    CharacterEditor,
    type CharacterEditorActionLog,
    type CharacterSectionPlacement,
    type CharacterEditorValues,
} from "../workspace/CharacterEditor";
import type { AutosaveStatus, WorkspaceMetafieldAssignment } from "../../types";
import type { DocumentRef } from "../ui/ListInput";

const SYSTEM_METAFIELD_PREFIX = "_sys:";
const SYSTEM_LAYOUT_FIELD = "_sys:character-editor-layout";
const SYSTEM_ACTION_LOG_FIELD = "_sys:character-editor-action-log";

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
        metafieldDefinitions,
        metafieldAssignments,
        editorTemplates,
        activeDocument,
        updateCharacterLocally,
        addOrUpdateMetafieldDefinitionLocally,
        addOrUpdateMetafieldAssignmentLocally,
        updateMetafieldAssignmentLocally,
        removeMetafieldAssignmentLocally,
        removeMetafieldDefinitionLocally,
        saveCharacterInfo,
        createOrReuseMetafieldDefinition,
        assignMetafieldToEntity,
        saveMetafieldValue,
        removeMetafieldFromEntity,
        deleteMetafieldDefinitionGlobal,
        generateCharacterImage,
        generateCharacterSong,
        generateCharacterPlaylist,
        importAsset,
        setAutosaveStatus: setGlobalAutosaveStatus,
        setAutosaveError: setGlobalAutosaveError,
        markDocumentEditorDirty,
        clearDocumentEditorDirty,
        setActiveDocument,
        consumePendingTitleFocus,
    } = useAppStore();

    const editorSelection = React.useMemo(
        () => ({ kind: "character", id: characterId }) as const,
        [characterId],
    );

    const [autosaveStatus, setAutosaveStatus] =
        React.useState<AutosaveStatus>("idle");
    const [focusTitleOnMount, setFocusTitleOnMount] = React.useState(false);
    const actionLogBufferRef = React.useRef<CharacterEditorActionLog[]>([]);
    const actionLogFlushTimerRef = React.useRef<ReturnType<
        typeof setTimeout
    > | null>(null);

    const isActiveEditor =
        activeDocument?.kind === "character" &&
        activeDocument.id === characterId;

    React.useEffect(() => {
        if (isActiveEditor) {
            setGlobalAutosaveStatus(autosaveStatus);
        }
    }, [isActiveEditor, autosaveStatus, setGlobalAutosaveStatus]);

    React.useEffect(() => {
        if (!isActiveEditor) {
            return;
        }

        if (consumePendingTitleFocus({ kind: "character", id: characterId })) {
            setFocusTitleOnMount(true);
        }
    }, [characterId, consumePendingTitleFocus, isActiveEditor]);

    const character = React.useMemo(
        () => characters.find((c) => c.id === characterId),
        [characters, characterId],
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
            character
                ? resolveStoredImageUrls(character.galleryImageIds ?? [])
                : [],
        [character, resolveStoredImageUrls],
    );

    const songUrl = React.useMemo(
        () =>
            character?.bgmId ? assets.bgms[character.bgmId]?.url : undefined,
        [character, assets.bgms],
    );

    const imageOptions = React.useMemo(
        () =>
            Object.values(assets.images).map((image) => ({
                id: image.id,
                label: image.id.slice(0, 8),
            })),
        [assets.images],
    );

    const characterMetafieldAssignments = React.useMemo(
        () =>
            metafieldAssignments.filter(
                (assignment) =>
                    assignment.entityType === "character" &&
                    assignment.entityId === characterId,
            ),
        [metafieldAssignments, characterId],
    );

    const characterEditorTemplate = React.useMemo(
        () =>
            editorTemplates.find(
                (template) => template.editorType === "character",
            ) ?? null,
        [editorTemplates],
    );

    const definitionById = React.useMemo(
        () =>
            new Map(
                metafieldDefinitions.map((definition) => [
                    definition.id,
                    definition,
                ]),
            ),
        [metafieldDefinitions],
    );

    const visibleMetafieldDefinitions = React.useMemo(
        () =>
            metafieldDefinitions.filter(
                (definition) =>
                    !definition.name.startsWith(SYSTEM_METAFIELD_PREFIX),
            ),
        [metafieldDefinitions],
    );

    const visibleCharacterMetafieldAssignments = React.useMemo(
        () =>
            characterMetafieldAssignments.filter((assignment) => {
                const definition = definitionById.get(assignment.definitionId);
                if (!definition) {
                    return false;
                }
                return !definition.name.startsWith(SYSTEM_METAFIELD_PREFIX);
            }),
        [characterMetafieldAssignments, definitionById],
    );

    const getSystemAssignment = React.useCallback(
        (systemName: string): WorkspaceMetafieldAssignment | undefined =>
            characterMetafieldAssignments.find((assignment) => {
                const definition = definitionById.get(assignment.definitionId);
                return definition?.name === systemName;
            }),
        [characterMetafieldAssignments, definitionById],
    );

    const ensureSystemAssignment = React.useCallback(
        async (
            systemName: string,
            initialValue: unknown,
        ): Promise<WorkspaceMetafieldAssignment> => {
            const existing = getSystemAssignment(systemName);
            if (existing) {
                return existing;
            }

            const definitionResponse = await createOrReuseMetafieldDefinition({
                projectId,
                name: systemName,
                scope: "character",
                valueType: "string",
            });

            addOrUpdateMetafieldDefinitionLocally(
                definitionResponse.definition,
            );

            const assignmentResponse = await assignMetafieldToEntity({
                definitionId: definitionResponse.definition.id,
                entityType: "character",
                entityId: characterId,
            });

            addOrUpdateMetafieldAssignmentLocally(
                assignmentResponse.assignment,
            );

            await saveMetafieldValue({
                assignmentId: assignmentResponse.assignment.id,
                value: initialValue,
            });

            updateMetafieldAssignmentLocally(assignmentResponse.assignment.id, {
                valueJson: initialValue,
                updatedAt: new Date(),
            });

            return {
                ...assignmentResponse.assignment,
                valueJson: initialValue,
            };
        },
        [
            addOrUpdateMetafieldAssignmentLocally,
            addOrUpdateMetafieldDefinitionLocally,
            assignMetafieldToEntity,
            characterId,
            createOrReuseMetafieldDefinition,
            getSystemAssignment,
            projectId,
            saveMetafieldValue,
            updateMetafieldAssignmentLocally,
        ],
    );

    const initialSectionPlacement = React.useMemo(() => {
        const layoutAssignment = getSystemAssignment(SYSTEM_LAYOUT_FIELD);
        if (!layoutAssignment) {
            return undefined;
        }

        const value = layoutAssignment.valueJson as
            | {
                  left?: string[];
                  right?: string[];
              }
            | undefined;

        if (
            !value ||
            !Array.isArray(value.left) ||
            !Array.isArray(value.right)
        ) {
            return undefined;
        }

        return {
            left: value.left as CharacterSectionPlacement["left"],
            right: value.right as CharacterSectionPlacement["right"],
        };
    }, [getSystemAssignment]);

    const handleSectionLayoutSync = React.useCallback(
        async (placement: CharacterSectionPlacement) => {
            if (!projectId) {
                return;
            }

            const assignment = await ensureSystemAssignment(
                SYSTEM_LAYOUT_FIELD,
                placement,
            );
            await saveMetafieldValue({
                assignmentId: assignment.id,
                value: placement,
            });

            updateMetafieldAssignmentLocally(assignment.id, {
                valueJson: placement,
                updatedAt: new Date(),
            });
        },
        [
            ensureSystemAssignment,
            projectId,
            saveMetafieldValue,
            updateMetafieldAssignmentLocally,
        ],
    );

    const flushActionLog = React.useCallback(async () => {
        if (!projectId) {
            return;
        }

        if (actionLogBufferRef.current.length === 0) {
            return;
        }

        const bufferedEntries = actionLogBufferRef.current;
        actionLogBufferRef.current = [];

        const assignment = await ensureSystemAssignment(
            SYSTEM_ACTION_LOG_FIELD,
            { entries: [] },
        );

        const current = (getSystemAssignment(SYSTEM_ACTION_LOG_FIELD)
            ?.valueJson as { entries?: unknown[] } | undefined) ?? {
            entries: [],
        };

        const currentEntries = Array.isArray(current.entries)
            ? current.entries
            : [];

        const appendedEntries = bufferedEntries.map((entry) => ({
            timestamp: new Date().toISOString(),
            action: entry.action,
            payload: entry.payload ?? null,
        }));

        const nextEntries = [...currentEntries, ...appendedEntries].slice(-500);
        const nextValue = { entries: nextEntries };

        await saveMetafieldValue({
            assignmentId: assignment.id,
            value: nextValue,
        });

        updateMetafieldAssignmentLocally(assignment.id, {
            valueJson: nextValue,
            updatedAt: new Date(),
        });
    }, [
        ensureSystemAssignment,
        getSystemAssignment,
        projectId,
        saveMetafieldValue,
        updateMetafieldAssignmentLocally,
    ]);

    const handleActionLog = React.useCallback(
        async (entry: CharacterEditorActionLog) => {
            if (!projectId) {
                return;
            }

            actionLogBufferRef.current.push(entry);

            if (actionLogFlushTimerRef.current) {
                return;
            }

            actionLogFlushTimerRef.current = setTimeout(() => {
                actionLogFlushTimerRef.current = null;
                void flushActionLog();
            }, 600);
        },
        [projectId, flushActionLog],
    );

    React.useEffect(
        () => () => {
            if (actionLogFlushTimerRef.current) {
                clearTimeout(actionLogFlushTimerRef.current);
                actionLogFlushTimerRef.current = null;
            }
        },
        [],
    );

    // Build available documents for slash-command references
    const availableDocuments: DocumentRef[] = React.useMemo(() => {
        const docs: DocumentRef[] = [];

        chapters.forEach((ch) => {
            docs.push({
                kind: "chapter",
                id: ch.id,
                name: ch.title || `Chapter ${ch.order}`,
                previewTitle: ch.title || `Chapter ${ch.order}`,
                previewContent: ch.content,
                previewContentType: "tiptap-json",
            });
        });

        scrapNotes.forEach((sn) => {
            docs.push({
                kind: "scrapNote",
                id: sn.id,
                name: sn.title || "Untitled Note",
                previewTitle: sn.title || "Untitled Note",
                previewContent: sn.content,
                previewContentType: "tiptap-json",
            });
        });

        characters.forEach((c) => {
            if (c.id !== characterId) {
                docs.push({
                    kind: "character",
                    id: c.id,
                    name: c.name || "Untitled Character",
                    previewTitle: c.name || "Untitled Character",
                    previewContent: c.description || "",
                    previewContentType: "html",
                });
            }
        });

        locations.forEach((loc) => {
            docs.push({
                kind: "location",
                id: loc.id,
                name: loc.name || "Untitled Location",
                previewTitle: loc.name || "Untitled Location",
                previewContent: loc.description || "",
                previewContentType: "html",
            });
        });

        organizations.forEach((org) => {
            docs.push({
                kind: "organization",
                id: org.id,
                name: org.name || "Untitled Organization",
                previewTitle: org.name || "Untitled Organization",
                previewContent: org.description || "",
                previewContentType: "html",
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
        [setActiveDocument],
    );

    const handleSubmit = React.useCallback(
        async (values: CharacterEditorValues) => {
            if (!character || !projectId) return;

            setAutosaveStatus("saving");

            const payload = {
                name: values.name,
                description: values.description,
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
                        prev === "saved" ? "idle" : prev,
                    );
                }, 2000);
            } catch (error) {
                setAutosaveStatus("error");
                setGlobalAutosaveError("Failed to save character");
                updateCharacterLocally(character.id, originalCharacter);
                throw error;
            }
        },
        [
            character,
            projectId,
            updateCharacterLocally,
            saveCharacterInfo,
            setGlobalAutosaveError,
        ],
    );

    const handleDirtyStateChange = React.useCallback(
        (isDirty: boolean) => {
            if (isDirty) {
                markDocumentEditorDirty(editorSelection);
                return;
            }

            clearDocumentEditorDirty(editorSelection);
        },
        [clearDocumentEditorDirty, editorSelection, markDocumentEditorDirty],
    );

    React.useEffect(
        () => () => {
            clearDocumentEditorDirty(editorSelection);
        },
        [clearDocumentEditorDirty, editorSelection],
    );

    const addImageLocally = React.useCallback(
        (image: { id: string }) => {
            if (!character) {
                return;
            }

            useAppStore.setState((state) => ({
                assets: {
                    ...state.assets,
                    images: {
                        ...state.assets.images,
                        [image.id]: image as never,
                    },
                },
            }));

            if (!character.galleryImageIds.includes(image.id)) {
                updateCharacterLocally(character.id, {
                    galleryImageIds: [...character.galleryImageIds, image.id],
                    updatedAt: new Date(),
                });
            }
        },
        [character, updateCharacterLocally],
    );

    const setBgmLocally = React.useCallback(
        (bgm: { id: string }) => {
            if (!character) {
                return;
            }

            useAppStore.setState((state) => ({
                assets: {
                    ...state.assets,
                    bgms: {
                        ...state.assets.bgms,
                        [bgm.id]: bgm as never,
                    },
                },
            }));

            updateCharacterLocally(character.id, {
                bgmId: bgm.id,
                updatedAt: new Date(),
            });
        },
        [character, updateCharacterLocally],
    );

    const setPlaylistLocally = React.useCallback(
        (playlist: { id: string }) => {
            if (!character) {
                return;
            }

            useAppStore.setState((state) => ({
                assets: {
                    ...state.assets,
                    playlists: {
                        ...state.assets.playlists,
                        [playlist.id]: playlist as never,
                    },
                },
            }));

            updateCharacterLocally(character.id, {
                playlistId: playlist.id,
                updatedAt: new Date(),
            });
        },
        [character, updateCharacterLocally],
    );

    // Handlers
    const handleGeneratePortrait = async () => {
        if (!projectId || !character) return;
        const response = await generateCharacterImage({
            projectId,
            characterId: character.id,
        });
        addImageLocally(response.image);
    };

    const handleImportPortrait = async (file: File) => {
        if (!projectId || !character) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        const response = await importAsset({
            projectId,
            payload: {
                kind: "image",
                subjectType: "character",
                subjectId: character.id,
                fileData: buffer,
                extension,
            },
        });

        if (response.kind === "image") {
            addImageLocally(response.image);
        }
    };

    const handleGenerateSong = async () => {
        if (!projectId || !character) return;
        const response = await generateCharacterSong({
            projectId,
            characterId: character.id,
        });
        setBgmLocally(response.track);
    };

    const handleImportSong = async (file: File) => {
        if (!projectId || !character) return;
        const buffer = await file.arrayBuffer();
        const extension = file.name.split(".").pop();
        const response = await importAsset({
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

        if (response.kind === "bgm") {
            setBgmLocally(response.track);
        }
    };

    const handleGeneratePlaylist = async () => {
        if (!projectId || !character) return;
        const response = await generateCharacterPlaylist({
            projectId,
            characterId: character.id,
        });
        setPlaylistLocally(response.playlist);
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

        const response = await importAsset({
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

        if (response.kind === "playlist") {
            setPlaylistLocally(response.playlist);
        }
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
            const original = characterMetafieldAssignments.find(
                (item) => item.id === request.assignmentId,
            );

            const optimisticPatch: Partial<WorkspaceMetafieldAssignment> = {
                ...(request.value !== undefined
                    ? { valueJson: request.value }
                    : {}),
                ...(request.orderIndex !== undefined
                    ? { orderIndex: request.orderIndex }
                    : {}),
                updatedAt: new Date(),
            };

            updateMetafieldAssignmentLocally(
                request.assignmentId,
                optimisticPatch,
            );

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
            characterMetafieldAssignments,
            saveMetafieldValue,
            updateMetafieldAssignmentLocally,
        ],
    );

    const handleRemoveMetafieldFromEntity = React.useCallback(
        async (request: Parameters<typeof removeMetafieldFromEntity>[0]) => {
            const existing = characterMetafieldAssignments.find(
                (assignment) =>
                    assignment.definitionId === request.definitionId,
            );

            await removeMetafieldFromEntity(request);

            if (existing) {
                removeMetafieldAssignmentLocally(existing.id);
            }
        },
        [
            characterMetafieldAssignments,
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
            if (!projectId || !character) {
                throw new Error("Project or character is missing.");
            }

            const buffer = await file.arrayBuffer();
            const extension = file.name.split(".").pop();
            const response = await importAsset({
                projectId,
                payload: {
                    kind: "image",
                    subjectType: "character",
                    subjectId: character.id,
                    fileData: buffer,
                    extension,
                },
            });

            if (response.kind !== "image") {
                throw new Error("Imported asset is not an image.");
            }

            return response.image.id;
        },
        [character, importAsset, projectId],
    );

    if (!character) {
        return <div className="empty-editor">Character not found.</div>;
    }

    return (
        <CharacterEditor
            projectId={projectId}
            character={character}
            locations={locations}
            organizations={organizations}
            allCharacters={characters}
            metafieldDefinitions={visibleMetafieldDefinitions}
            metafieldAssignments={visibleCharacterMetafieldAssignments}
            imageOptions={imageOptions}
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
            editorTemplate={characterEditorTemplate}
            onActionLog={handleActionLog}
            onSectionLayoutSync={handleSectionLayoutSync}
            initialSectionPlacement={initialSectionPlacement}
            onDirtyStateChange={handleDirtyStateChange}
            onNavigateToDocument={handleNavigateToDocument}
            focusTitleOnMount={focusTitleOnMount}
        />
    );
};
