import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { ConfirmationDialog } from "../components/dialogs/ConfirmationDialog";
import { showDownloadToast } from "../components/ui/DownloadToast";
import { useAppStore } from "../state/appStore";
import { normalizeUserFacingError } from "../utils/userFacingError";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import sparkleIcon from "../../../assets/icons/sparkle.png";
import inkyIcon from "../../../assets/icons/inky.png";
import wrenchIcon from "../../../assets/icons/wrench.png";
import personIcon from "../../../assets/icons/person.png";
import genAiIcon from "../../../assets/icons/gen-ai.png";
import musicIcon from "../../../assets/icons/music.png";

type SettingsSection = "theme" | "features" | "models" | "account";

interface FeatureDownloadProgress {
    downloadType: string;
    percentage: number;
    status: "pending" | "downloading" | "extracting" | "completed" | "error";
    error?: string;
}

type ThemeMode = "dark" | "light";

export const SettingsView: React.FC = () => {
    const user = useAppStore((state) => state.user);
    const currentUserId = useAppStore((state) => state.currentUserId);
    const saveUserSettings = useAppStore((state) => state.saveUserSettings);
    const updateAccountEmail = useAppStore((state) => state.updateAccountEmail);
    const updateAccountPassword = useAppStore(
        (state) => state.updateAccountPassword,
    );
    const deleteAccount = useAppStore((state) => state.deleteAccount);
    const logout = useAppStore((state) => state.logout);
    const returnToProjects = useAppStore((state) => state.returnToProjects);

    const [activeSection, setActiveSection] =
        useState<SettingsSection>("account");

    // Theme & personalization (CSS vars)
    const [accent, setAccent] = useState("#2ef6ad");
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Model configuration
    const [geminiApiKey, setGeminiApiKey] = useState("");
    const [modelStatus, setModelStatus] = useState<string | null>(null);

    // Account
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [accountStatus, setAccountStatus] = useState<string | null>(null);
    const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Feature management
    const [featureConfig, setFeatureConfig] = useState<{
        features: {
            aiChat: boolean;
            imageGeneration: boolean;
            audioGeneration: boolean;
        };
        modelsDownloaded: { image: boolean; audio: boolean };
        comfyuiInstalled: boolean;
        isWindows: boolean;
    } | null>(null);
    const [imageProgress, setImageProgress] =
        useState<FeatureDownloadProgress | null>(null);
    const [audioProgress, setAudioProgress] =
        useState<FeatureDownloadProgress | null>(null);
    const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

    const setThemeMode = useCallback((mode: ThemeMode) => {
        const root = document.documentElement;
        root.dataset.theme = mode;
        // Clear legacy inline overrides so theme tokens drive colors.
        root.style.removeProperty("--text");
        setIsDarkMode(mode === "dark");
    }, []);

    useEffect(() => {
        const styles = getComputedStyle(document.documentElement);
        const getHex = (varName: string) => {
            const val = styles.getPropertyValue(varName).trim();
            if (val.startsWith("#") && val.length > 7) {
                return val.substring(0, 7);
            }
            return val;
        };

        const currentAccent = getHex("--accent");
        if (currentAccent) setAccent(currentAccent);

        const root = document.documentElement;
        const existingTheme = root.dataset.theme;
        if (existingTheme === "dark" || existingTheme === "light") {
            setThemeMode(existingTheme);
            return;
        }

        const textColor = styles.getPropertyValue("--text").trim();
        // Legacy fallback for sessions before `data-theme` was introduced.
        const resolvedMode =
            textColor.toLowerCase() === "#242424" ? "light" : "dark";
        setThemeMode(resolvedMode);
    }, [setThemeMode]);

    useEffect(() => {
        if (!user) {
            return;
        }

        // Seed fields with current values (without exposing secrets).
        setNewEmail(user.email);
    }, [user]);

    // Load feature config on mount
    useEffect(() => {
        window.featureApi
            .getConfig()
            .then((config) => {
                setFeatureConfig(config);
                // If a feature is enabled but its model isn't downloaded,
                // a download is likely in-flight (started by the startup
                // prompt). Pre-populate the progress bar so it picks up
                // incoming events.
                if (
                    config.isWindows &&
                    config.features.imageGeneration &&
                    !config.modelsDownloaded.image
                ) {
                    setImageProgress({
                        downloadType: "image",
                        percentage: 0,
                        status: "downloading",
                    });
                }
                if (
                    config.isWindows &&
                    config.features.audioGeneration &&
                    !config.modelsDownloaded.audio
                ) {
                    setAudioProgress({
                        downloadType: "audio",
                        percentage: 0,
                        status: "downloading",
                    });
                }
            })
            .catch((): void => {});
    }, []);

    // Listen for download progress events (from settings toggles OR startup prompt)
    useEffect(() => {
        if (!window.featureEvents?.onDownloadProgress) return;

        const unsubscribe = window.featureEvents.onDownloadProgress(
            (progress) => {
                const p: FeatureDownloadProgress = {
                    downloadType: progress.downloadType,
                    percentage: progress.percentage,
                    status: progress.status,
                    error: progress.error,
                };

                // Route progress to the right feature bar.
                // ComfyUI is a shared prerequisite – show its progress on
                // whichever feature(s) is being downloaded.
                if (progress.downloadType === "comfyui") {
                    // Always show ComfyUI progress; we can't tell which
                    // feature triggered it so show on both when ambiguous.
                    setImageProgress((prev) => (prev !== null ? p : prev));
                    setAudioProgress((prev) => (prev !== null ? p : prev));
                    // If nothing is shown yet, default to whichever feature is toggling
                    if (togglingFeature === "imageGeneration") {
                        setImageProgress(p);
                    } else if (togglingFeature === "audioGeneration") {
                        setAudioProgress(p);
                    }
                } else if (progress.downloadType === "image") {
                    setImageProgress(p);
                } else if (progress.downloadType === "audio") {
                    setAudioProgress(p);
                }

                // On completion / error: clear progress bar + refresh config.
                // Toasts are handled by the code that initiated the download
                // (handleToggleFeature or FeaturePromptDialog) to avoid dupes.
                if (
                    progress.status === "completed" ||
                    progress.status === "error"
                ) {
                    if (progress.downloadType === "image") {
                        setTimeout(() => setImageProgress(null), 1500);
                    }
                    if (progress.downloadType === "audio") {
                        setTimeout(() => setAudioProgress(null), 1500);
                    }

                    // Refresh config
                    window.featureApi
                        .getConfig()
                        .then((c) => {
                            setFeatureConfig(c);
                            setTogglingFeature(null);
                        })
                        .catch((): void => {});
                }
            },
        );

        return () => {
            unsubscribe();
        };
    }, [togglingFeature]);

    const handleToggleFeature = useCallback(
        async (feature: "imageGeneration" | "audioGeneration") => {
            if (!featureConfig || togglingFeature) return;
            const isEnabled = featureConfig.features[feature];
            const label = feature === "imageGeneration" ? "Image" : "Audio";

            setTogglingFeature(feature);

            // Set initial progress bar so ComfyUI progress is shown
            if (!isEnabled) {
                const setter =
                    feature === "imageGeneration"
                        ? setImageProgress
                        : setAudioProgress;
                setter({
                    downloadType:
                        feature === "imageGeneration" ? "image" : "audio",
                    percentage: 0,
                    status: "pending",
                });
            }

            if (isEnabled) {
                // Disable – deletes model files (sync path)
                try {
                    await window.featureApi.disableFeature(feature);
                    showDownloadToast(
                        `${label} generation disabled. Files cleaned up.`,
                    );
                } catch {
                    showDownloadToast(`${label} disable failed.`, "error");
                } finally {
                    // Always refresh config and unlock buttons after disable
                    try {
                        const c = await window.featureApi.getConfig();
                        setFeatureConfig(c);
                    } catch {
                        /* noop */
                    }
                    setTogglingFeature(null);
                }
            } else {
                // Enable – triggers background downloads (async path).
                // enableFeature resolves once the full download+extraction
                // finishes on the main process side.
                window.featureApi
                    .enableFeature(feature)
                    .then(() => {
                        showDownloadToast(`${label} generation is ready!`);
                    })
                    .catch(() => {
                        showDownloadToast(`${label} download failed.`, "error");
                    });

                // Refresh config so the UI reflects the enabled flag
                window.featureApi
                    .getConfig()
                    .then((c) => setFeatureConfig(c))
                    .catch((): void => {});
            }
        },
        [featureConfig, togglingFeature],
    );

    const updateCssVar = (name: string, value: string) => {
        document.documentElement.style.setProperty(name, value);
    };

    const syncTitleBarOverlay = () => {
        if (!window.windowControls?.setTitleBarOverlay) {
            return;
        }

        const styles = getComputedStyle(document.documentElement);
        const surfaceValue = styles.getPropertyValue("--surface").trim();
        const textValue = styles.getPropertyValue("--text").trim();
        const titlebarHeightRaw = styles
            .getPropertyValue("--titlebar-height")
            .trim();
        const titlebarHeight = Number.parseInt(titlebarHeightRaw, 10) || 36;
        const overlayHeight = Math.max(0, titlebarHeight - 1);

        window.windowControls
            .setTitleBarOverlay({
                color: surfaceValue || "#222324",
                symbolColor: textValue || "#f6f7fb",
                height: overlayHeight,
            })
            .catch(() => {
                /* noop */
            });
    };

    const saveAppearancePreferences = useCallback(
        async (payload: { theme?: ThemeMode; accentColor?: string }) => {
            if (!currentUserId.trim()) {
                return;
            }

            await saveUserSettings({
                userId: currentUserId,
                preferences: payload,
            });
        },
        [currentUserId, saveUserSettings],
    );

    const handleAccentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAccent(val);
        updateCssVar("--accent", val);
        updateCssVar("--accent-transparent", val + "11");
        updateCssVar("--accent-transparent2", val + "44");
        updateCssVar("--accent-light", val);
        void saveAppearancePreferences({ accentColor: val });
    };

    const handleThemeModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const mode: ThemeMode = e.target.checked ? "dark" : "light";
        setThemeMode(mode);
        void saveAppearancePreferences({ theme: mode });
        window.requestAnimationFrame(syncTitleBarOverlay);
    };

    const handleReset = () => {
        setAccent("#2ef6ad");
        setThemeMode("dark");

        updateCssVar("--accent", "#2ef6ad");
        updateCssVar("--accent-transparent", "#2ef6ad11");
        updateCssVar("--accent-transparent2", "#2ef6ad44");
        updateCssVar("--accent-light", "#b4ffeb");

        document.documentElement.style.removeProperty("--surface");
        document.documentElement.style.removeProperty("--surface-strong");

        void saveAppearancePreferences({
            theme: "dark",
            accentColor: "#2ef6ad",
        });

        syncTitleBarOverlay();
    };

    const navItems = useMemo(
        () =>
            [
                {
                    id: "account" as const,
                    title: "Account",
                    subtitle: "Email and password",
                    icon: personIcon,
                },
                {
                    id: "theme" as const,
                    title: "Theme & Personalization",
                    subtitle: "Colors and UI appearance",
                    icon: sparkleIcon,
                },
                {
                    id: "features" as const,
                    title: "AI Features",
                    subtitle: "Image & audio generation",
                    icon: inkyIcon,
                },
                {
                    id: "models" as const,
                    title: "Model Configuration",
                    subtitle: "Gemini API key",
                    icon: wrenchIcon,
                },
            ] satisfies Array<{
                id: SettingsSection;
                title: string;
                subtitle: string;
                icon: string;
            }>,
        [],
    );

    const handleSaveGeminiKey = async () => {
        setModelStatus(null);
        try {
            const key = geminiApiKey.trim();
            if (!currentUserId.trim()) {
                throw new Error("You must be signed in to save settings.");
            }
            if (!key) {
                throw new Error("Gemini API key is required.");
            }

            await saveUserSettings({
                userId: currentUserId,
                preferences: { geminiApiKey: key },
            });
            setGeminiApiKey("");
            setModelStatus("Saved.");
        } catch (error) {
            setModelStatus(
                normalizeUserFacingError(
                    error,
                    "Failed to save.",
                    "settings-model",
                ),
            );
        }
    };

    const handleUpdateEmail = async () => {
        setAccountStatus(null);
        setIsSubmittingAccount(true);
        try {
            const nextEmail = newEmail.trim();
            if (!nextEmail) {
                throw new Error("Email is required.");
            }
            await updateAccountEmail({ newEmail: nextEmail });
            setAccountStatus(
                "Email update requested. Check your inbox if confirmation is required.",
            );
        } catch (error) {
            setAccountStatus(
                normalizeUserFacingError(
                    error,
                    "Failed to update email.",
                    "settings-account",
                ),
            );
        } finally {
            setIsSubmittingAccount(false);
        }
    };

    const handleUpdatePassword = async () => {
        setAccountStatus(null);
        setIsSubmittingAccount(true);
        try {
            const nextPassword = newPassword;
            if (!nextPassword) {
                throw new Error("Password is required.");
            }
            await updateAccountPassword({ newPassword: nextPassword });
            setNewPassword("");
            setAccountStatus("Password updated.");
        } catch (error) {
            setAccountStatus(
                normalizeUserFacingError(
                    error,
                    "Failed to update password.",
                    "settings-account",
                ),
            );
        } finally {
            setIsSubmittingAccount(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeletingAccount(true);
        setAccountStatus(null);
        try {
            await deleteAccount();
        } catch (error) {
            setAccountStatus(
                normalizeUserFacingError(
                    error,
                    "Failed to delete account.",
                    "settings-account",
                ),
            );
        } finally {
            setIsDeletingAccount(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <div>
                    <p className="panel-label">Settings</p>
                    <p className="panel-subtitle">
                        Configure Inkline to fit your needs.
                    </p>
                </div>
                <div className="settings-header-actions">
                    <Button onClick={handleReset} variant="ghost" size="sm">
                        Reset to Defaults
                    </Button>
                    <Button
                        onClick={() => returnToProjects()}
                        variant="ghost"
                        size="sm"
                    >
                        Back
                    </Button>
                </div>
            </div>

            <div className="settings-layout">
                <nav className="settings-sidebar" aria-label="Settings">
                    {navItems.map((item) => (
                        <Button
                            key={item.id}
                            variant="ghost"
                            className={
                                "settings-nav-button" +
                                (activeSection === item.id ? " is-active" : "")
                            }
                            onClick={() => setActiveSection(item.id)}
                            type="button"
                        >
                            <div
                                className="flex-row"
                                style={{ alignItems: "flex-start" }}
                            >
                                <img
                                    src={item.icon}
                                    alt=""
                                    className="settings-nav-icon"
                                />
                                <div
                                    className="flex-column"
                                    style={{ alignItems: "flex-start" }}
                                >
                                    <div className="settings-nav-title">
                                        {item.title}
                                    </div>
                                    <div className="settings-nav-subtitle">
                                        {item.subtitle}
                                    </div>
                                </div>
                            </div>
                        </Button>
                    ))}
                </nav>

                <main className="settings-content">
                    <div key={activeSection} className="settings-content-inner">
                        {activeSection === "theme" ? (
                            <>
                                <h2>Theme & Personalization</h2>
                                <p className="panel-subtitle">
                                    Adjust Inkline's colors and readability.
                                </p>

                                <div className="settings-section">
                                    <div className="dialog-field">
                                        <Label htmlFor="theme-mode-toggle">
                                            Theme Mode
                                        </Label>
                                        <div className="settings-theme-toggle-row">
                                            <span className="settings-theme-mode-label">
                                                Light
                                            </span>
                                            <label
                                                className="settings-theme-switch"
                                                htmlFor="theme-mode-toggle"
                                            >
                                                <input
                                                    id="theme-mode-toggle"
                                                    className="settings-theme-switch-input"
                                                    type="checkbox"
                                                    checked={isDarkMode}
                                                    onChange={
                                                        handleThemeModeChange
                                                    }
                                                    aria-label="Toggle dark mode"
                                                />
                                                <span
                                                    className="settings-theme-switch-slider"
                                                    aria-hidden="true"
                                                />
                                            </label>
                                            <span className="settings-theme-mode-label">
                                                Dark
                                            </span>
                                        </div>
                                        <p className="helper-text">
                                            Switches the entire interface
                                            between dark and light mode.
                                        </p>
                                    </div>

                                    <div className="dialog-field">
                                        <Label htmlFor="accent-color">
                                            Accent Color
                                        </Label>
                                        <div className="settings-row">
                                            <Input
                                                id="accent-color"
                                                type="color"
                                                value={accent}
                                                onChange={handleAccentChange}
                                                style={{
                                                    height: "40px",
                                                    padding: "2px",
                                                    width: "60px",
                                                    flex: "none",
                                                }}
                                            />
                                            <span
                                                style={{
                                                    fontFamily: "monospace",
                                                }}
                                            >
                                                {accent}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {activeSection === "features" ? (
                            <>
                                <h2>AI Features</h2>
                                <p className="panel-subtitle">
                                    Enable or disable local AI generation.
                                    Downloads happen in the background.
                                </p>

                                {featureConfig && !featureConfig.isWindows && (
                                    <div className="feature-platform-warning">
                                        Local AI features (Image & Audio
                                        Generation) are only available on
                                        Windows.
                                    </div>
                                )}

                                <div className="settings-section">
                                    {/* Image Generation */}
                                    <div className="feature-toggle-card">
                                        <div className="feature-toggle-icon">
                                            <img
                                                src={genAiIcon}
                                                alt="Image Generation"
                                                style={{
                                                    width: "24px",
                                                    height: "24px",
                                                    objectFit: "contain",
                                                }}
                                            />
                                        </div>
                                        <div className="feature-toggle-info">
                                            <h3 className="feature-toggle-name">
                                                Image Generation
                                            </h3>
                                            <p className="feature-toggle-desc">
                                                Generate character portraits,
                                                location art, and scene
                                                illustrations locally.
                                            </p>
                                            {featureConfig?.isWindows && (
                                                <p className="feature-toggle-note">
                                                    {featureConfig.features
                                                        .imageGeneration &&
                                                    featureConfig
                                                        .modelsDownloaded.image
                                                        ? "Installed"
                                                        : "Requires ~10 GB download"}
                                                </p>
                                            )}
                                            {!featureConfig?.isWindows && (
                                                <p className="feature-toggle-note feature-toggle-note--disabled">
                                                    Windows only
                                                </p>
                                            )}
                                            {imageProgress && (
                                                <div className="feature-progress">
                                                    <div className="feature-progress-label">
                                                        {imageProgress.status ===
                                                        "extracting"
                                                            ? "Extracting..."
                                                            : imageProgress.status ===
                                                                "completed"
                                                              ? "Complete!"
                                                              : imageProgress.status ===
                                                                  "error"
                                                                ? `Error: ${imageProgress.error}`
                                                                : `Downloading... ${imageProgress.percentage}%`}
                                                    </div>
                                                    <div className="feature-progress-bar">
                                                        <div
                                                            className="feature-progress-fill"
                                                            style={{
                                                                width: `${imageProgress.percentage}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant={
                                                featureConfig?.features
                                                    .imageGeneration
                                                    ? "secondary"
                                                    : "primary"
                                            }
                                            size="sm"
                                            disabled={
                                                !featureConfig?.isWindows ||
                                                !!togglingFeature ||
                                                !!imageProgress
                                            }
                                            onClick={() =>
                                                handleToggleFeature(
                                                    "imageGeneration",
                                                )
                                            }
                                        >
                                            {imageProgress
                                                ? "Downloading..."
                                                : featureConfig?.features
                                                        .imageGeneration
                                                  ? "Disable"
                                                  : "Enable"}
                                        </Button>
                                    </div>

                                    {/* Audio Generation */}
                                    <div className="feature-toggle-card">
                                        <div className="feature-toggle-icon">
                                            <img
                                                src={musicIcon}
                                                alt="Audio Generation"
                                                style={{
                                                    width: "24px",
                                                    height: "24px",
                                                    objectFit: "contain",
                                                }}
                                            />
                                        </div>
                                        <div className="feature-toggle-info">
                                            <h3 className="feature-toggle-name">
                                                Audio Generation
                                            </h3>
                                            <p className="feature-toggle-desc">
                                                Create character themes,
                                                location ambience, and
                                                background music locally.
                                            </p>
                                            {featureConfig?.isWindows && (
                                                <p className="feature-toggle-note">
                                                    {featureConfig.features
                                                        .audioGeneration &&
                                                    featureConfig
                                                        .modelsDownloaded.audio
                                                        ? "Installed"
                                                        : "Requires ~7.5 GB download"}
                                                </p>
                                            )}
                                            {!featureConfig?.isWindows && (
                                                <p className="feature-toggle-note feature-toggle-note--disabled">
                                                    Windows only
                                                </p>
                                            )}
                                            {audioProgress && (
                                                <div className="feature-progress">
                                                    <div className="feature-progress-label">
                                                        {audioProgress.status ===
                                                        "extracting"
                                                            ? "Extracting..."
                                                            : audioProgress.status ===
                                                                "completed"
                                                              ? "Complete!"
                                                              : audioProgress.status ===
                                                                  "error"
                                                                ? `Error: ${audioProgress.error}`
                                                                : `Downloading... ${audioProgress.percentage}%`}
                                                    </div>
                                                    <div className="feature-progress-bar">
                                                        <div
                                                            className="feature-progress-fill"
                                                            style={{
                                                                width: `${audioProgress.percentage}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            variant={
                                                featureConfig?.features
                                                    .audioGeneration
                                                    ? "secondary"
                                                    : "primary"
                                            }
                                            size="sm"
                                            disabled={
                                                !featureConfig?.isWindows ||
                                                !!togglingFeature ||
                                                !!audioProgress
                                            }
                                            onClick={() =>
                                                handleToggleFeature(
                                                    "audioGeneration",
                                                )
                                            }
                                        >
                                            {audioProgress
                                                ? "Downloading..."
                                                : featureConfig?.features
                                                        .audioGeneration
                                                  ? "Disable"
                                                  : "Enable"}
                                        </Button>
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {activeSection === "models" ? (
                            <>
                                <h2>Model Configuration</h2>
                                <p className="panel-subtitle">
                                    Connect external model providers.
                                </p>

                                <div className="settings-section">
                                    <div className="dialog-field">
                                        <Label htmlFor="gemini-api-key">
                                            Gemini API Key
                                        </Label>
                                        <div className="settings-row">
                                            <Input
                                                id="gemini-api-key"
                                                type="password"
                                                value={geminiApiKey}
                                                placeholder="Paste your key"
                                                onChange={(e) =>
                                                    setGeminiApiKey(
                                                        e.target.value,
                                                    )
                                                }
                                                style={{ flex: 1 }}
                                            />
                                            <Button
                                                onClick={handleSaveGeminiKey}
                                                variant="primary"
                                            >
                                                Save
                                            </Button>
                                        </div>
                                        <p className="helper-text">
                                            Stored locally and used for Gemini
                                            powered features.
                                        </p>
                                        {modelStatus ? (
                                            <p className="helper-text">
                                                {modelStatus}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {activeSection === "account" ? (
                            <>
                                <h2>Account</h2>
                                <p className="panel-subtitle">
                                    Update your sign-in details.
                                </p>

                                <div className="settings-section">
                                    <div className="dialog-field">
                                        <Label htmlFor="account-email">
                                            Email
                                        </Label>
                                        <div className="settings-row">
                                            <Input
                                                id="account-email"
                                                type="email"
                                                value={newEmail}
                                                onChange={(e) =>
                                                    setNewEmail(e.target.value)
                                                }
                                                style={{ flex: 1 }}
                                                disabled={!user}
                                            />
                                            <Button
                                                onClick={handleUpdateEmail}
                                                variant="primary"
                                                style={{ width: "180px" }}
                                                disabled={
                                                    !user || isSubmittingAccount
                                                }
                                            >
                                                Update Email
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="dialog-field">
                                        <Label htmlFor="account-password">
                                            New Password
                                        </Label>
                                        <div className="settings-row">
                                            <Input
                                                id="account-password"
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) =>
                                                    setNewPassword(
                                                        e.target.value,
                                                    )
                                                }
                                                style={{ flex: 1 }}
                                                disabled={!user}
                                            />
                                            <Button
                                                onClick={handleUpdatePassword}
                                                variant="primary"
                                                style={{ width: "180px" }}
                                                disabled={
                                                    !user || isSubmittingAccount
                                                }
                                            >
                                                Update Password
                                            </Button>
                                        </div>
                                    </div>

                                    {accountStatus ? (
                                        <p className="helper-text">
                                            {accountStatus}
                                        </p>
                                    ) : null}
                                </div>

                                <div
                                    className="settings-section"
                                    style={{
                                        marginTop: "1.25rem",
                                        paddingTop: "1rem",
                                        borderTop: "1px solid var(--border)",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "1rem",
                                        }}
                                    >
                                        <h3
                                            style={{
                                                margin: "0 0 0 0",
                                                fontSize: "1rem",
                                            }}
                                        >
                                            Session
                                        </h3>
                                        <p
                                            className="panel-subtitle"
                                            style={{ marginBottom: "0.75rem" }}
                                        >
                                            Sign out of your account on this
                                            device.
                                        </p>
                                        <Button
                                            onClick={logout}
                                            variant="secondary"
                                            disabled={!user}
                                        >
                                            Log Out
                                        </Button>
                                    </div>
                                </div>

                                <div
                                    className="settings-section"
                                    style={{
                                        marginTop: "1rem",
                                        paddingTop: "1rem",
                                        borderTop: "1px solid var(--border)",
                                    }}
                                >
                                    <div className="danger-callout">
                                        <div className="danger-callout-header">
                                            <span className="danger-callout-icon">
                                                <WarningAmberIcon
                                                    style={{ fontSize: 18 }}
                                                />
                                            </span>
                                            Danger Zone
                                        </div>
                                        <p className="danger-callout-body">
                                            Permanently deletes your account and{" "}
                                            <strong>all associated data</strong>{" "}
                                            — projects, characters, locations,
                                            and generated assets. This cannot be
                                            undone.
                                        </p>
                                        <div>
                                            <Button
                                                onClick={() =>
                                                    setShowDeleteConfirm(true)
                                                }
                                                variant="danger"
                                                disabled={
                                                    !user || isDeletingAccount
                                                }
                                            >
                                                {isDeletingAccount
                                                    ? "Deleting…"
                                                    : "Delete Account"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <ConfirmationDialog
                                    open={showDeleteConfirm}
                                    onOpenChange={setShowDeleteConfirm}
                                    title="Delete your account?"
                                    description="This will permanently delete your account and all your projects, characters, locations, and generated assets. This action cannot be undone."
                                    confirmLabel="Delete My Account"
                                    variant="danger"
                                    onConfirm={handleDeleteAccount}
                                />
                            </>
                        ) : null}
                    </div>
                </main>
            </div>
        </div>
    );
};
