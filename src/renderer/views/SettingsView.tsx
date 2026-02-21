import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { showDownloadToast } from "../components/ui/DownloadToast";
import { useAppStore } from "../state/appStore";

type SettingsSection = "theme" | "features" | "models" | "account";

interface FeatureDownloadProgress {
    downloadType: string;
    percentage: number;
    status: "pending" | "downloading" | "extracting" | "completed" | "error";
    error?: string;
}

/** Helper to format bytes into a human-readable string. */
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export const SettingsView: React.FC = () => {
    const user = useAppStore((state) => state.user);
    const currentUserId = useAppStore((state) => state.currentUserId);
    const saveUserSettings = useAppStore((state) => state.saveUserSettings);
    const updateAccountEmail = useAppStore((state) => state.updateAccountEmail);
    const updateAccountPassword = useAppStore(
        (state) => state.updateAccountPassword,
    );
    const logout = useAppStore((state) => state.logout);
    const closeSettings = useAppStore((state) => state.closeSettings);
    const returnToProjects = useAppStore((state) => state.returnToProjects);
    const previousStage = useAppStore((state) => state.previousStage);

    const [activeSection, setActiveSection] =
        useState<SettingsSection>("theme");

    // Theme & personalization (CSS vars)
    const [accent, setAccent] = useState("#2ef6ad");
    const [surface, setSurface] = useState("#222324");
    const [surfaceStrong, setSurfaceStrong] = useState("#202022");
    const [isDarkMode, setIsDarkMode] = useState(true);

    // Model configuration
    const [geminiApiKey, setGeminiApiKey] = useState("");
    const [modelStatus, setModelStatus] = useState<string | null>(null);

    // Account management
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [accountStatus, setAccountStatus] = useState<string | null>(null);
    const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

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

        const currentSurface = getHex("--surface");
        if (currentSurface) setSurface(currentSurface);

        const currentSurfaceStrong = getHex("--surface-strong");
        if (currentSurfaceStrong) setSurfaceStrong(currentSurfaceStrong);

        const textColor = styles.getPropertyValue("--text").trim();
        // Check if text is light (indicating dark mode)
        // #f6f7fb is the default light text color
        setIsDarkMode(textColor.toLowerCase() === "#f6f7fb");
    }, []);

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
            .catch(() => {});
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
                        .catch(() => {});
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
                    .catch(() => {});
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

        window.windowControls
            .setTitleBarOverlay({
                color: surfaceValue || "#222324",
                symbolColor: textValue || "#f6f7fb",
                height: titlebarHeight,
            })
            .catch(() => {
                /* noop */
            });
    };

    const handleAccentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setAccent(val);
        updateCssVar("--accent", val);
        updateCssVar("--accent-transparent", val + "11");
        updateCssVar("--accent-transparent2", val + "44");
        updateCssVar("--accent-light", val);
    };

    const handleSurfaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSurface(val);
        updateCssVar("--surface", val);
        syncTitleBarOverlay();
    };

    const handleSurfaceStrongChange = (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const val = e.target.value;
        setSurfaceStrong(val);
        updateCssVar("--surface-strong", val);
    };

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        if (newMode) {
            updateCssVar("--text", "#f6f7fb");
        } else {
            updateCssVar("--text", "#242424");
        }

        syncTitleBarOverlay();
    };

    const handleReset = () => {
        setAccent("#2ef6ad");
        setSurface("#222324");
        setSurfaceStrong("#202022");
        setIsDarkMode(true);

        updateCssVar("--accent", "#2ef6ad");
        updateCssVar("--accent-transparent", "#2ef6ad11");
        updateCssVar("--accent-transparent2", "#2ef6ad44");
        updateCssVar("--accent-light", "#b4ffeb");

        updateCssVar("--surface", "#222324");
        updateCssVar("--surface-strong", "#202022");

        updateCssVar("--text", "#f6f7fb");

        syncTitleBarOverlay();
    };

    const navItems = useMemo(
        () =>
            [
                {
                    id: "theme" as const,
                    title: "Theme & Personalization",
                    subtitle: "Colors and UI appearance",
                },
                {
                    id: "features" as const,
                    title: "AI Features",
                    subtitle: "Image & audio generation",
                },
                {
                    id: "models" as const,
                    title: "Model Configuration",
                    subtitle: "Gemini API key",
                },
                {
                    id: "account" as const,
                    title: "Account Management",
                    subtitle: "Email and password",
                },
            ] satisfies Array<{
                id: SettingsSection;
                title: string;
                subtitle: string;
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
            setModelStatus((error as Error)?.message ?? "Failed to save.");
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
                (error as Error)?.message ?? "Failed to update email.",
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
                (error as Error)?.message ?? "Failed to update password.",
            );
        } finally {
            setIsSubmittingAccount(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-header">
                <div>
                    <p className="panel-label">Settings</p>
                    <p className="panel-subtitle">
                        Manage appearance, models, and your account.
                    </p>
                </div>
                <div className="settings-header-actions">
                    <Button onClick={handleReset} variant="ghost" size="sm">
                        Reset to Defaults
                    </Button>
                    {previousStage === "workspace" && (
                        <Button
                            onClick={closeSettings}
                            variant="ghost"
                            size="sm"
                        >
                            Back to Workspace
                        </Button>
                    )}
                    <Button
                        onClick={() => returnToProjects()}
                        variant="ghost"
                        size="sm"
                    >
                        Back to Projects
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
                            <span className="settings-nav-title">
                                {item.title}
                            </span>
                            <span className="settings-nav-subtitle">
                                {item.subtitle}
                            </span>
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
                                        <Label>Theme Mode</Label>
                                        <div className="settings-row">
                                            <Button
                                                onClick={toggleTheme}
                                                variant="secondary"
                                                style={{ flex: 1 }}
                                            >
                                                {isDarkMode
                                                    ? "Switch to Light Mode (Text)"
                                                    : "Switch to Dark Mode (Text)"}
                                            </Button>
                                        </div>
                                        <p className="helper-text">
                                            Toggles the text color between light
                                            and dark.
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

                                    <div className="dialog-field">
                                        <Label htmlFor="surface-color">
                                            Surface Color
                                        </Label>
                                        <div className="settings-row">
                                            <Input
                                                id="surface-color"
                                                type="color"
                                                value={surface}
                                                onChange={handleSurfaceChange}
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
                                                {surface}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="dialog-field">
                                        <Label htmlFor="surface-strong-color">
                                            Surface Strong Color
                                        </Label>
                                        <div className="settings-row">
                                            <Input
                                                id="surface-strong-color"
                                                type="color"
                                                value={surfaceStrong}
                                                onChange={
                                                    handleSurfaceStrongChange
                                                }
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
                                                {surfaceStrong}
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
                                            🎨
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
                                            🎵
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
                                <h2>Account Management</h2>
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
                                        marginTop: "2rem",
                                        paddingTop: "1.5rem",
                                        borderTop: "1px solid var(--border)",
                                    }}
                                >
                                    <h3
                                        style={{
                                            margin: "0 0 0.5rem 0",
                                            fontSize: "1rem",
                                        }}
                                    >
                                        Session
                                    </h3>
                                    <p
                                        className="panel-subtitle"
                                        style={{ marginBottom: "1rem" }}
                                    >
                                        Sign out of your account on this device.
                                    </p>
                                    <Button
                                        onClick={logout}
                                        variant="secondary"
                                        disabled={!user}
                                    >
                                        Log Out
                                    </Button>
                                </div>
                            </>
                        ) : null}
                    </div>
                </main>
            </div>
        </div>
    );
};
