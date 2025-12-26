import React from "react";

import type {
    WorkspaceCharacter,
    WorkspaceLocation,
    WorkspaceOrganization,
} from "../../types";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { TagsInput } from "../ui/Tags";

export type CharacterEditorValues = {
    name: string;
    race: string;
    age: string;
    description: string;
    traits: string;
    goals: string;
    secrets: string;
    tags: string[];
    currentLocationId: string;
    backgroundLocationId: string;
    organizationId: string;
};

export type CharacterEditorProps = {
    character: WorkspaceCharacter;
    locations: WorkspaceLocation[];
    organizations: WorkspaceOrganization[];
    gallerySources: string[];
    songUrl?: string;
    onSubmit: (values: CharacterEditorValues) => Promise<void>;
    onGeneratePortrait: () => Promise<void>;
    onImportPortrait: (file: File) => Promise<void>;
    onGenerateSong: () => Promise<void>;
    onImportSong: (file: File) => Promise<void>;
    onGeneratePlaylist: () => Promise<void>;
    onImportPlaylist: (file: File) => Promise<void>;
};

const defaultValues = (
    character: WorkspaceCharacter
): CharacterEditorValues => ({
    name: character.name ?? "",
    race: character.race ?? "",
    age: character.age?.toString() ?? "",
    description: character.description ?? "",
    traits: (character.traits ?? []).join("\n"),
    goals: (character.goals ?? []).join("\n"),
    secrets: (character.secrets ?? []).join("\n"),
    tags: character.tags ?? [],
    currentLocationId: character.currentLocationId ?? "",
    backgroundLocationId: character.backgroundLocationId ?? "",
    organizationId: character.organizationId ?? "",
});

export const CharacterEditor: React.FC<CharacterEditorProps> = ({
    character,
    locations,
    organizations,
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
    const [values, setValues] = React.useState<CharacterEditorValues>(() =>
        defaultValues(character)
    );
    const [isSaving, setSaving] = React.useState(false);
    const [assetBusy, setAssetBusy] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
    const firstImageRef = React.useRef<string | undefined>(undefined);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const songInputRef = React.useRef<HTMLInputElement>(null);
    const playlistInputRef = React.useRef<HTMLInputElement>(null);
    const isUserChange = React.useRef(false);

    React.useEffect(() => {
        isUserChange.current = false;
        setValues(defaultValues(character));
        setError(null);
    }, [character]);

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
        field: keyof CharacterEditorValues,
        value: string | string[]
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
                (submitError as Error)?.message ?? "Failed to save character."
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
                (importError as Error)?.message ?? "Failed to import portrait."
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
                    "Failed to generate portrait."
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
    console.log("[CharacterEditor] Render", {
        currentImageIndex,
        total: gallerySources.length,
        portraitUrl,
    });
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
                        <p className="panel-label">Character</p>
                        <h2>{values.name || "Untitled Character"}</h2>
                    </div>
                    <div className="entity-actions">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSaving}
                        >
                            {isSaving ? "Saving…" : "Save profile"}
                        </Button>
                    </div>
                </div>
                <div className="entity-editor-grid">
                    <div className="entity-column">
                        <div className="entity-field">
                            <Label htmlFor="character-name">Name</Label>
                            <Input
                                id="character-name"
                                value={values.name}
                                onChange={(event) =>
                                    handleChange("name", event.target.value)
                                }
                                placeholder="Name"
                            />
                        </div>
                        <div className="entity-row">
                            <div className="entity-field">
                                <Label htmlFor="character-race">Race</Label>
                                <Input
                                    id="character-race"
                                    value={values.race}
                                    onChange={(event) =>
                                        handleChange("race", event.target.value)
                                    }
                                    placeholder="Human"
                                />
                            </div>
                            <div className="entity-field">
                                <Label htmlFor="character-age">Age</Label>
                                <Input
                                    id="character-age"
                                    type="number"
                                    value={values.age}
                                    onChange={(event) =>
                                        handleChange("age", event.target.value)
                                    }
                                    placeholder="32"
                                    min="0"
                                />
                            </div>
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="character-description">
                                Description
                            </Label>
                            <textarea
                                id="character-description"
                                className="text-area"
                                value={values.description}
                                onChange={(event) =>
                                    handleChange(
                                        "description",
                                        event.target.value
                                    )
                                }
                                rows={5}
                                placeholder="Physical appearance, demeanor, etc."
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="character-traits">Traits</Label>
                            <textarea
                                id="character-traits"
                                className="text-area"
                                value={values.traits}
                                onChange={(event) =>
                                    handleChange("traits", event.target.value)
                                }
                                rows={3}
                                placeholder={"Enter one trait per line"}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="character-goals">Goals</Label>
                            <textarea
                                id="character-goals"
                                className="text-area"
                                value={values.goals}
                                onChange={(event) =>
                                    handleChange("goals", event.target.value)
                                }
                                rows={3}
                                placeholder={"Enter one goal per line"}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="character-secrets">Secrets</Label>
                            <textarea
                                id="character-secrets"
                                className="text-area"
                                value={values.secrets}
                                onChange={(event) =>
                                    handleChange("secrets", event.target.value)
                                }
                                rows={3}
                                placeholder={"Enter one secret per line"}
                            />
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="character-tags">Tags</Label>
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
                                        No portrait yet
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
                                    {assetBusy
                                        ? "Working…"
                                        : "Generate portrait"}
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
                            {portraitUrl && (
                                <div
                                    style={{
                                        padding: "0.5rem",
                                        background: "rgba(0,0,0,0.2)",
                                        borderRadius: "8px",
                                        fontSize: "0.75rem",
                                        wordBreak: "break-all",
                                    }}
                                >
                                    <p
                                        style={{
                                            margin: "0 0 0.5rem",
                                            color: "var(--text-error)",
                                        }}
                                    >
                                        Debug: Image not showing?
                                    </p>
                                    <a
                                        href={portraitUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            color: "var(--accent)",
                                            textDecoration: "underline",
                                        }}
                                    >
                                        Open Image in Browser
                                    </a>
                                </div>
                            )}
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
                                        {character.bgmId
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
                                        {character.playlistId
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
                        <div className="entity-field">
                            <Label htmlFor="character-current-location">
                                Current location
                            </Label>
                            <select
                                id="character-current-location"
                                className="input"
                                value={values.currentLocationId}
                                onChange={(event) =>
                                    handleChange(
                                        "currentLocationId",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">Unassigned</option>
                                {locations.map((location) => (
                                    <option
                                        key={location.id}
                                        value={location.id}
                                    >
                                        {location.name || "Untitled location"}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="character-origin-location">
                                Origin location
                            </Label>
                            <select
                                id="character-origin-location"
                                className="input"
                                value={values.backgroundLocationId}
                                onChange={(event) =>
                                    handleChange(
                                        "backgroundLocationId",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">Unassigned</option>
                                {locations.map((location) => (
                                    <option
                                        key={location.id}
                                        value={location.id}
                                    >
                                        {location.name || "Untitled location"}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="entity-field">
                            <Label htmlFor="character-organization">
                                Affiliated organization
                            </Label>
                            <select
                                id="character-organization"
                                className="input"
                                value={values.organizationId}
                                onChange={(event) =>
                                    handleChange(
                                        "organizationId",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">Unassigned</option>
                                {organizations.map((organization) => (
                                    <option
                                        key={organization.id}
                                        value={organization.id}
                                    >
                                        {organization.name ||
                                            "Untitled organization"}
                                    </option>
                                ))}
                            </select>
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
