import React from "react";

import type { WorkspaceLocation, WorkspaceOrganization } from "../../types";
import { ActionDropdown } from "../ui/ActionDropdown";
import { ChevronLeftIcon, ChevronRightIcon } from "../ui/Icons";
import { Label } from "../ui/Label";
import { ListInput, type DocumentRef } from "../ui/ListInput";
import {
    SearchableMultiSelect,
    type SelectOption,
} from "../ui/SearchableSelect";
import { TagsInput } from "../ui/Tags";
import { showToast } from "../ui/GenerationProgressToast";
import {
    normalizeUserFacingError,
    type UserErrorContext,
} from "../../utils/userFacingError";

export type OrganizationEditorValues = {
    name: string;
    description: string[];
    mission: string[];
    tags: string[];
    locationIds: string[];
};

export type OrganizationEditorProps = {
    organization: WorkspaceOrganization;
    locations: WorkspaceLocation[];
    gallerySources: string[];
    songUrl?: string;
    availableDocuments?: DocumentRef[];
    onSubmit: (values: OrganizationEditorValues) => Promise<void>;
    onNavigateToDocument?: (ref: DocumentRef) => void;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onGenerateSong: () => Promise<void>;
    onImportSong: (file: File) => Promise<void>;
    onGeneratePlaylist: () => Promise<void>;
    onImportPlaylist: (file: File) => Promise<void>;
};

const defaultValues = (
    organization: WorkspaceOrganization,
): OrganizationEditorValues => ({
    name: organization.name ?? "",
    description: organization.description
        ? organization.description.split("\n").filter((s) => s.trim())
        : [],
    mission: organization.mission
        ? organization.mission.split("\n").filter((s) => s.trim())
        : [],
    tags: organization.tags ?? [],
    locationIds: organization.locationIds ?? [],
});

export const OrganizationEditor: React.FC<OrganizationEditorProps> = ({
    organization,
    locations,
    gallerySources,
    songUrl,
    availableDocuments = [],
    onSubmit,
    onNavigateToDocument,
    onGeneratePortrait,
    onImportPortrait,
    onGenerateSong,
    onImportSong,
    onGeneratePlaylist,
    onImportPlaylist,
}) => {
    const [values, setValues] = React.useState<OrganizationEditorValues>(() =>
        defaultValues(organization),
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

    // Memoize options for searchable multi-select
    const locationOptions: SelectOption[] = React.useMemo(
        () =>
            locations.map((loc) => ({
                id: loc.id,
                label: loc.name || "Untitled location",
            })),
        [locations],
    );

    const handleChange = (
        field: keyof OrganizationEditorValues,
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
            setError(
                toFriendlyError(submitError, "Failed to save organization."),
            );
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

    const triggerFilePick = () => fileInputRef.current?.click();

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
            setError(toFriendlyError(importError, "Failed to import crest."));
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
                    "Failed to generate crest.",
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
                        <p className="panel-label">Organization</p>
                        <input
                            type="text"
                            className="entity-name-input"
                            value={values.name}
                            onChange={(e) =>
                                handleChange("name", e.target.value)
                            }
                            placeholder="Untitled Organization"
                        />
                    </div>
                </div>
                <div className="entity-editor-grid">
                    <div className="entity-column">
                        <div className="entity-field">
                            <Label htmlFor="organization-description">
                                Description
                            </Label>
                            <ListInput
                                value={values.description}
                                onChange={(items) =>
                                    handleChange("description", items)
                                }
                                placeholder="Add description point... (use / to reference)"
                                addButtonLabel=""
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="organization-mission">
                                Mission
                            </Label>
                            <ListInput
                                value={values.mission}
                                onChange={(items) =>
                                    handleChange("mission", items)
                                }
                                placeholder="Add mission point... (use / to reference)"
                                addButtonLabel=""
                                availableDocuments={availableDocuments}
                                onReferenceClick={onNavigateToDocument}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="organization-tags">Tags</Label>
                            <TagsInput
                                value={values.tags}
                                onChange={(tags) => handleChange("tags", tags)}
                                placeholder="Enter one tag per line"
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="organization-locations">
                                Locations
                            </Label>
                            <SearchableMultiSelect
                                value={values.locationIds}
                                options={locationOptions}
                                onChange={(ids) =>
                                    handleChange("locationIds", ids)
                                }
                                placeholder="Search to add locations..."
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
                                        No crest yet
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
                                            label: "Generate crest",
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
                                            label: organization.bgmId
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
                                            label: organization.playlistId
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
                {error ? (
                    <span className="card-hint is-error">{error}</span>
                ) : null}
            </form>
        </div>
    );
};
