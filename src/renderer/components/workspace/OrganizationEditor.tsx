import React from "react";

import type { WorkspaceLocation, WorkspaceOrganization } from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { TagsInput } from "../ui/Tags";

export type OrganizationEditorValues = {
    name: string;
    description: string;
    mission: string;
    tags: string[];
    locationIds: string[];
};

export type OrganizationEditorProps = {
    organization: WorkspaceOrganization;
    locations: WorkspaceLocation[];
    gallerySources: string[];
    songUrl?: string;
    onSubmit: (values: OrganizationEditorValues) => Promise<void>;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onGenerateSong: () => Promise<void>;
    onImportSong: (file: File) => Promise<void>;
    onGeneratePlaylist: () => Promise<void>;
    onImportPlaylist: (file: File) => Promise<void>;
};

const defaultValues = (
    organization: WorkspaceOrganization
): OrganizationEditorValues => ({
    name: organization.name ?? "",
    description: organization.description ?? "",
    mission: organization.mission ?? "",
    tags: organization.tags ?? [],
    locationIds: organization.locationIds ?? [],
});

export const OrganizationEditor: React.FC<OrganizationEditorProps> = ({
    organization,
    locations,
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
    const [values, setValues] = React.useState<OrganizationEditorValues>(() =>
        defaultValues(organization)
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
        setValues(defaultValues(organization));
        setError(null);
    }, [organization]);

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
        field: keyof OrganizationEditorValues,
        value: string | string[]
    ) => {
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
                (submitError as Error)?.message ??
                    "Failed to save organization."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleBlur = () => {
        handleSubmit();
    };

    const triggerFilePick = () => fileInputRef.current?.click();

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
                (importError as Error)?.message ?? "Failed to import crest."
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
                (generateError as Error)?.message ?? "Failed to generate crest."
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
                        <p className="panel-label">Organization</p>
                        <h2>{values.name || "Untitled Organization"}</h2>
                    </div>
                    <div className="entity-actions">
                        <Button type="submit" variant="primary" disabled={isSaving}>
                            {isSaving ? "Saving…" : "Save organization"}
                        </Button>
                    </div>
                </div>
                <div className="entity-editor-grid">
                    <div className="entity-column">
                        <div className="entity-field">
                            <Label htmlFor="organization-name">Name</Label>
                            <Input
                                id="organization-name"
                                value={values.name}
                                onChange={(event) =>
                                    handleChange("name", event.target.value)
                                }
                                onBlur={handleBlur}
                                placeholder="House Astra"
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="organization-description">
                                Description
                            </Label>
                            <textarea
                                id="organization-description"
                                className="text-area"
                                rows={4}
                                value={values.description}
                                onChange={(event) =>
                                    handleChange("description", event.target.value)
                                }
                                onBlur={handleBlur}
                                placeholder="Purpose, history, notable feats"
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="organization-mission">Mission</Label>
                            <textarea
                                id="organization-mission"
                                className="text-area"
                                rows={3}
                                value={values.mission}
                                onChange={(event) =>
                                    handleChange("mission", event.target.value)
                                }
                                onBlur={handleBlur}
                                placeholder="Core goals"
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="organization-tags">Tags</Label>
                            <TagsInput
                                value={values.tags}
                                onChange={(tags) => handleChange("tags", tags)}
                                onBlur={handleBlur}
                                placeholder="Enter one tag per line"
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="organization-locations">
                                Locations
                            </Label>
                            <select
                                id="organization-locations"
                                className="input"
                                multiple
                                value={values.locationIds}
                                onChange={(event) => {
                                    const selected = Array.from(
                                        event.target.selectedOptions
                                    ).map((option) => option.value);
                                    handleChange("locationIds", selected);
                                }}
                                onBlur={handleBlur}
                            >
                                {locations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                        {location.name || "Untitled location"}
                                    </option>
                                ))}
                            </select>
                            <span className="helper-text">
                                Hold Ctrl / Cmd to select multiple.
                            </span>
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
                                        No crest yet
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
                                    {assetBusy ? "Working…" : "Generate crest"}
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
                                        {organization.bgmId
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
                                        {organization.playlistId
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
                                <span className="summary-label">Reach</span>
                                <span className="summary-value">
                                    {values.locationIds.length} locations
                                </span>
                            </div>
                            <div>
                                <span className="summary-label">
                                    Gallery images
                                </span>
                                <span className="summary-value">
                                    {organization.galleryImageIds.length}
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
