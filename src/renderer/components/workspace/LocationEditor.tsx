import React from "react";

import type { WorkspaceLocation } from "../../types";
import { ActionDropdown } from "../ui/ActionDropdown";
import { ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons";
import { Label } from "../ui/Label";
import { ListInput, type DocumentRef } from "../ui/ListInput";
import { TagsInput } from "../ui/Tags";
import { RichTextAreaInput } from "../ui/RichTextAreaInput";
import { showToast } from "../ui/GenerationProgressToast";
import {
    normalizeUserFacingError,
    type UserErrorContext,
} from "../../utils/userFacingError";

export type LocationEditorValues = {
    name: string;
    description: string;
    culture: string;
    history: string;
    conflicts: string[];
    tags: string[];
};

export type LocationEditorProps = {
    location: WorkspaceLocation;
    gallerySources: string[];
    songUrl?: string;
    /** All documents available for slash-command references */
    availableDocuments?: DocumentRef[];
    onSubmit: (values: LocationEditorValues) => Promise<void>;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onGenerateSong: () => Promise<void>;
    onImportSong: (file: File) => Promise<void>;
    onGeneratePlaylist: () => Promise<void>;
    onImportPlaylist: (file: File) => Promise<void>;
    /** Navigate to a referenced document */
    onNavigateToDocument?: (ref: DocumentRef) => void;
};

const defaultValues = (location: WorkspaceLocation): LocationEditorValues => ({
    name: location.name ?? "",
    description: location.description ?? "",
    culture: location.culture ?? "",
    history: location.history ?? "",
    conflicts: location.conflicts ?? [],
    tags: location.tags ?? [],
});

export const LocationEditor: React.FC<LocationEditorProps> = ({
    location,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onSubmit,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
    onNavigateToDocument,
}) => {
    const [values, setValues] = React.useState<LocationEditorValues>(() =>
        defaultValues(location),
    );
    const [, setSaving] = React.useState(false);
    const [assetBusy, setAssetBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const songInputRef = React.useRef<HTMLInputElement>(null);
    const playlistInputRef = React.useRef<HTMLInputElement>(null);
    const isUserChange = React.useRef(false);

    const toFriendlyError = React.useCallback(
        (error: unknown, fallback: string, context?: UserErrorContext) =>
            normalizeUserFacingError(error, fallback, context),
        [],
    );

    React.useEffect(() => {
        isUserChange.current = false;
        setValues(defaultValues(location));
        setError(null);
    }, [location]);

    React.useEffect(() => {
        if (!gallerySources.length) {
            firstImageRef.current = undefined;
            setCurrentImageIndex(0);
            return;
        }

        const currentFirst = gallerySources[0];
        const previousFirst = firstImageRef.current;
        firstImageRef.current = currentFirst;

        setCurrentImageIndex((prev) => {
            if (!gallerySources.length) {
                return 0;
            }
            if (currentFirst && currentFirst !== previousFirst) {
                return 0;
            }
            if (prev >= gallerySources.length) {
                return gallerySources.length - 1;
            }
            return prev;
        });
    }, [gallerySources]);

    const handleChange = (
        field: keyof LocationEditorValues,
        value: string | string[],
    ) => {
        isUserChange.current = true;
        setValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            await onSubmit(values);
        } catch (submitError) {
            setError(toFriendlyError(submitError, "Failed to save location."));
        } finally {
            setSaving(false);
        }
    };

    const autosaveTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        if (!isUserChange.current) {
            return;
        }

        if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = setTimeout(() => {
            handleSubmit();
        }, 1000);

        return () => {
            if (autosaveTimerRef.current) {
                clearTimeout(autosaveTimerRef.current);
            }
        };
    }, [values]);

    const triggerFilePick = () => {
        fileInputRef.current?.click();
    };

    const triggerSongPick = () => {
        songInputRef.current?.click();
    };

    const triggerPlaylistPick = () => {
        playlistInputRef.current?.click();
    };

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setAssetBusy(true);
        setError(null);
        try {
            await onImportPortrait(file);
        } catch (importError) {
            setError(toFriendlyError(importError, "Failed to import artwork."));
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handleSongChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAssetBusy(true);
        setError(null);
        try {
            await onImportSong(file);
        } catch (importError) {
            setError(toFriendlyError(importError, "Failed to import song."));
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handlePlaylistChange = async (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAssetBusy(true);
        setError(null);
        try {
            await onImportPlaylist(file);
        } catch (importError) {
            setError(
                toFriendlyError(importError, "Failed to import playlist."),
            );
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handleGenerate = async () => {
        setAssetBusy(true);
        setError(null);
        try {
            await onGeneratePortrait();
        } catch (generateError) {
            showToast({
                id: "generation-image",
                variant: "error",
                title: "Image generation failed",
                description: toFriendlyError(
                    generateError,
                    "Failed to generate artwork.",
                    "generation-image",
                ),
                durationMs: 6000,
            });
        } finally {
            setAssetBusy(false);
        }
    };

    const handleAssetAction = async (
        action: () => Promise<void>,
        errorMessage: string,
        context: UserErrorContext,
        toastId: string,
        toastTitle: string,
    ) => {
        setAssetBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            showToast({
                id: toastId,
                variant: "error",
                title: toastTitle,
                description: toFriendlyError(err, errorMessage, context),
                durationMs: 6000,
            });
        } finally {
            setAssetBusy(false);
        }
    };

    const portraitUrl = gallerySources[currentImageIndex];
    const canCycleGallery = gallerySources.length > 1;

    const showNextImage = () => {
        if (!canCycleGallery) {
            return;
        }
        setCurrentImageIndex((prev) => (prev + 1) % gallerySources.length);
    };

    const showPreviousImage = () => {
        if (!canCycleGallery) {
            return;
        }
        setCurrentImageIndex(
            (prev) =>
                (prev - 1 + gallerySources.length) % gallerySources.length,
        );
    };

    return (
        <div className="entity-editor-panel">
            <form className="entity-editor" onSubmit={handleSubmit}>
                <div className="entity-header">
                    <div className="entity-header-title">
                        <p className="panel-label">Location</p>
                        <input
                            type="text"
                            className="entity-name-input"
                            value={values.name}
                            onChange={(e) =>
                                handleChange("name", e.target.value)
                            }
                            placeholder="Untitled Location"
                        />
                    </div>
                </div>
                <div className="entity-editor-grid">
                    <div className="entity-column">
                        <div className="entity-field">
                            <Label htmlFor="location-description">
                                Description
                            </Label>
                            <RichTextAreaInput
                                id="location-description"
                                rows={4}
                                placeholder="Overall vibe, landscape, architecture (use / to reference)"
                                value={values.description}
                                onChange={(val) =>
                                    handleChange("description", val)
                                }
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-culture">Culture</Label>
                            <RichTextAreaInput
                                id="location-culture"
                                rows={3}
                                placeholder="Traditions, customs, societal norms (use / to reference)"
                                value={values.culture}
                                onChange={(val) => handleChange("culture", val)}
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-history">History</Label>
                            <RichTextAreaInput
                                id="location-history"
                                rows={3}
                                placeholder="Important historical events (use / to reference)"
                                value={values.history}
                                onChange={(val) => handleChange("history", val)}
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                        <div className="entity-field">
                            <Label>Conflicts</Label>
                            <ListInput
                                value={values.conflicts}
                                onChange={(conflicts) =>
                                    handleChange("conflicts", conflicts)
                                }
                                placeholder="What tensions exist here?"
                                addButtonLabel=""
                                emptyMessage="No conflicts defined yet"
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-tags">Tags</Label>
                            <TagsInput
                                value={values.tags}
                                onChange={(tags) => handleChange("tags", tags)}
                                placeholder="Add a tag..."
                            />
                        </div>
                    </div>
                    <div className="entity-column">
                        <div className="portrait-card">
                            <div
                                className={
                                    "portrait-frame" +
                                    (portraitUrl ? " has-image" : "")
                                }
                                style={
                                    portraitUrl
                                        ? {
                                              backgroundImage: `url("${portraitUrl}")`,
                                          }
                                        : undefined
                                }
                            >
                                {!portraitUrl ? (
                                    <span className="portrait-placeholder">
                                        No art yet
                                    </span>
                                ) : null}
                            </div>
                            <div className="portrait-toolbar">
                                <div className="portrait-gallery-nav">
                                    <button
                                        type="button"
                                        className="gallery-nav-btn"
                                        onClick={showPreviousImage}
                                        disabled={!canCycleGallery}
                                    >
                                        <ChevronLeftIcon size={14} />
                                    </button>
                                    <span className="gallery-nav-label">
                                        {gallerySources.length > 0
                                            ? `${currentImageIndex + 1} of ${gallerySources.length}`
                                            : "0 of 0"}
                                    </span>
                                    <button
                                        type="button"
                                        className="gallery-nav-btn"
                                        onClick={showNextImage}
                                        disabled={!canCycleGallery}
                                    >
                                        <ChevronRightIcon size={14} />
                                    </button>
                                </div>
                                <ActionDropdown
                                    disabled={assetBusy}
                                    options={[
                                        {
                                            label: "Generate art",
                                            onClick: handleGenerate,
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import image",
                                            onClick: triggerFilePick,
                                            disabled: assetBusy,
                                        },
                                    ]}
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>
                        <div className="entity-summary">
                            <span className="summary-label">Audio Assets</span>
                            <div className="audio-asset-row">
                                <span className="audio-asset-label">
                                    Soundtrack
                                </span>
                                {songUrl && (
                                    <audio
                                        controls
                                        src={songUrl}
                                        className="audio-asset-player"
                                    />
                                )}
                                <ActionDropdown
                                    disabled={assetBusy}
                                    options={[
                                        {
                                            label: location.bgmId
                                                ? "Regenerate"
                                                : "Generate",
                                            onClick: () =>
                                                handleAssetAction(
                                                    onGenerateSong,
                                                    "Song generation failed",
                                                    "generation-audio",
                                                    "generation-audio",
                                                    "Audio generation failed",
                                                ),
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import",
                                            onClick: triggerSongPick,
                                            disabled: assetBusy,
                                        },
                                    ]}
                                />
                                <input
                                    ref={songInputRef}
                                    type="file"
                                    accept="audio/*"
                                    className="sr-only"
                                    onChange={handleSongChange}
                                />
                            </div>
                            <div className="audio-asset-row">
                                <span className="audio-asset-label">
                                    Playlist
                                </span>
                                <ActionDropdown
                                    disabled={assetBusy}
                                    options={[
                                        {
                                            label: location.playlistId
                                                ? "Regenerate"
                                                : "Generate",
                                            onClick: () =>
                                                handleAssetAction(
                                                    onGeneratePlaylist,
                                                    "Playlist generation failed",
                                                    "generation-playlist",
                                                    "generation-playlist",
                                                    "Playlist generation failed",
                                                ),
                                            disabled: assetBusy,
                                        },
                                        {
                                            label: "Import",
                                            onClick: triggerPlaylistPick,
                                            disabled: assetBusy,
                                        },
                                    ]}
                                />
                                <input
                                    ref={playlistInputRef}
                                    type="file"
                                    accept=".json"
                                    className="sr-only"
                                    onChange={handlePlaylistChange}
                                />
                            </div>
                        </div>
                        <div className="entity-summary">
                            <div>
                                <span className="summary-label">
                                    Characters present
                                </span>
                                <span className="summary-value">
                                    {location.characterIds.length}
                                </span>
                            </div>
                            <div>
                                <span className="summary-label">
                                    Organizations present
                                </span>
                                <span className="summary-value">
                                    {location.organizationIds.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                {error ? (
                    <span className="card-hint is-error">{error}</span>
                ) : null}
            </form>
        </div>
    );
};
