import React from "react";

import type { WorkspaceLocation } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { TagsInput } from "../ui/Tags";

export type LocationEditorValues = {
    name: string;
    description: string;
    culture: string;
    history: string;
    conflicts: string;
    tags: string[];
};

export type LocationEditorProps = {
    location: WorkspaceLocation;
    gallerySources: string[];
    songUrl?: string;
    onSubmit: (values: LocationEditorValues) => Promise<void>;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onGenerateSong: () => Promise<void>;
    onImportSong: (file: File) => Promise<void>;
    onGeneratePlaylist: () => Promise<void>;
    onImportPlaylist: (file: File) => Promise<void>;
};

const defaultValues = (location: WorkspaceLocation): LocationEditorValues => ({
    name: location.name ?? "",
    description: location.description ?? "",
    culture: location.culture ?? "",
    history: location.history ?? "",
    conflicts: (location.conflicts ?? []).join("\n"),
    tags: location.tags ?? [],
});

export const LocationEditor: React.FC<LocationEditorProps> = ({
    location,
    gallerySources,
    songUrl,
    onSubmit,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
}) => {
    const [values, setValues] = React.useState<LocationEditorValues>(() =>
        defaultValues(location)
    );
    const [isSaving, setSaving] = React.useState(false);
    const [assetBusy, setAssetBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const songInputRef = React.useRef<HTMLInputElement>(null);
    const playlistInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
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

    const handleChange = (field: keyof LocationEditorValues, value: string | string[]) => {
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
            setError(
                (submitError as Error)?.message ?? "Failed to save location."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleBlur = () => {
        handleSubmit();
    };

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
        event: React.ChangeEvent<HTMLInputElement>
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
            setError(
                (importError as Error)?.message ?? "Failed to import artwork."
            );
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handleSongChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAssetBusy(true);
        setError(null);
        try {
            await onImportSong(file);
        } catch (importError) {
            setError(
                (importError as Error)?.message ?? "Failed to import song."
            );
        } finally {
            setAssetBusy(false);
            event.target.value = "";
        }
    };

    const handlePlaylistChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAssetBusy(true);
        setError(null);
        try {
            await onImportPlaylist(file);
        } catch (importError) {
            setError(
                (importError as Error)?.message ?? "Failed to import playlist."
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
            setError(
                (generateError as Error)?.message ??
                    "Failed to generate artwork."
            );
        } finally {
            setAssetBusy(false);
        }
    };

    const handleAssetAction = async (
        action: () => Promise<void>,
        errorMessage: string
    ) => {
        setAssetBusy(true);
        setError(null);
        try {
            await action();
        } catch (err) {
            setError((err as Error)?.message ?? errorMessage);
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
            (prev) => (prev - 1 + gallerySources.length) % gallerySources.length
        );
    };

    return (
        <div className="entity-editor-panel">
            <form className="entity-editor" onSubmit={handleSubmit}>
                <div className="entity-header">
                    <div>
                        <p className="panel-label">Location</p>
                        <h2>{values.name || "Untitled Location"}</h2>
                    </div>
                    <div className="entity-actions">
                        <Button type="submit" variant="primary" disabled={isSaving}>
                            {isSaving ? "Saving…" : "Save location"}
                        </Button>
                    </div>
                </div>
                <div className="entity-editor-grid">
                    <div className="entity-column">
                        <div className="entity-field">
                            <Label htmlFor="location-name">Name</Label>
                            <Input
                                id="location-name"
                                value={values.name}
                                placeholder="Asteria Station"
                                onChange={(event) =>
                                    handleChange("name", event.target.value)
                                }
                                onBlur={handleBlur}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-description">
                                Description
                            </Label>
                            <textarea
                                id="location-description"
                                className="text-area"
                                rows={5}
                                placeholder="Overall vibe, landscape, architecture"
                                value={values.description}
                                onChange={(event) =>
                                    handleChange("description", event.target.value)
                                }
                                onBlur={handleBlur}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-culture">Culture</Label>
                            <textarea
                                id="location-culture"
                                className="text-area"
                                rows={4}
                                placeholder="Traditions, customs, societal norms"
                                value={values.culture}
                                onChange={(event) =>
                                    handleChange("culture", event.target.value)
                                }
                                onBlur={handleBlur}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-history">History</Label>
                            <textarea
                                id="location-history"
                                className="text-area"
                                rows={4}
                                placeholder="Important historical events"
                                value={values.history}
                                onChange={(event) =>
                                    handleChange("history", event.target.value)
                                }
                                onBlur={handleBlur}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-conflicts">Conflicts</Label>
                            <textarea
                                id="location-conflicts"
                                className="text-area"
                                rows={3}
                                placeholder="Enter one conflict per line"
                                value={values.conflicts}
                                onChange={(event) =>
                                    handleChange("conflicts", event.target.value)
                                }
                                onBlur={handleBlur}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="location-tags">Tags</Label>
                            <TagsInput
                                value={values.tags}
                                onChange={(tags) => handleChange("tags", tags)}
                                onBlur={handleBlur}
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
                            <div className="portrait-actions">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleGenerate}
                                    disabled={assetBusy}
                                >
                                    {assetBusy ? "Working…" : "Generate art"}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={triggerFilePick}
                                    disabled={assetBusy}
                                >
                                    Import image
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                />
                            </div>
                            {gallerySources.length ? (
                                <div className="portrait-actions">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={showPreviousImage}
                                        disabled={!canCycleGallery}
                                    >
                                        Previous
                                    </Button>
                                    <span className="summary-label">
                                        Image {currentImageIndex + 1} of{" "}
                                        {gallerySources.length}
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={showNextImage}
                                        disabled={!canCycleGallery}
                                    >
                                        Next
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                        <div className="entity-summary">
                            <span className="summary-label">Audio Assets</span>
                            <div className="portrait-actions">
                                <div className="button-group">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={assetBusy}
                                        onClick={() =>
                                            handleAssetAction(
                                                onGenerateSong,
                                                "Song generation failed"
                                            )
                                        }
                                    >
                                        {location.bgmId
                                            ? "Regenerate Song"
                                            : "Generate Song"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={assetBusy}
                                        onClick={triggerSongPick}
                                    >
                                        Import
                                    </Button>
                                    <input
                                        ref={songInputRef}
                                        type="file"
                                        accept="audio/*"
                                        className="sr-only"
                                        onChange={handleSongChange}
                                    />
                                </div>
                                {songUrl && (
                                    <audio
                                        controls
                                        src={songUrl}
                                        style={{
                                            width: "100%",
                                            marginTop: "0.5rem",
                                            height: "32px",
                                        }}
                                    />
                                )}

                                <div className="button-group">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={assetBusy}
                                        onClick={() =>
                                            handleAssetAction(
                                                onGeneratePlaylist,
                                                "Playlist generation failed"
                                            )
                                        }
                                    >
                                        {location.playlistId
                                            ? "Regenerate Playlist"
                                            : "Generate Playlist"}
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        disabled={assetBusy}
                                        onClick={triggerPlaylistPick}
                                    >
                                        Import
                                    </Button>
                                    <input
                                        ref={playlistInputRef}
                                        type="file"
                                        accept=".json"
                                        className="sr-only"
                                        onChange={handlePlaylistChange}
                                    />
                                </div>
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
                {error ? <span className="card-hint is-error">{error}</span> : null}
            </form>
        </div>
    );
};
