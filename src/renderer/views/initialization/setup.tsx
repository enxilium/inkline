import React, { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";

// Types for IPC communication
interface DownloadProgress {
    downloadType: "comfyui" | "image" | "audio" | "languagetool";
    downloadedBytes: number;
    totalBytes: number;
    percentage: number;
    status: "pending" | "downloading" | "extracting" | "completed" | "error";
    error?: string;
}

interface SetupConfig {
    features: {
        aiChat: boolean;
        imageGeneration: boolean;
        audioGeneration: boolean;
    };
    theme: {
        colorScheme: "dark" | "light";
        accentColor: string;
    };
}

interface PlatformInfo {
    platform: string;
    isWindows: boolean;
}

type SetupStep =
    | "welcome"
    | "features"
    | "downloads"
    | "finalizing"
    | "theme"
    | "complete";

const ACCENT_COLORS = [
    { name: "Blue", value: "#4a90e2" },
    { name: "Teal", value: "#50e39c" },
    { name: "Purple", value: "#9b59b6" },
    { name: "Orange", value: "#e67e22" },
    { name: "Pink", value: "#e91e63" },
    { name: "Cyan", value: "#00bcd4" },
];

// Helper to format bytes
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// Step Components
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
    <div style={styles.stepContainer}>
        <div style={styles.logoContainer}>
            <svg
                width="80"
                height="80"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient
                        id="logoGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                    >
                        <stop offset="0%" stopColor="#4a90e2" />
                        <stop offset="100%" stopColor="#50e39c" />
                    </linearGradient>
                </defs>
                <path
                    d="M20 80 L50 20 L80 80"
                    stroke="url(#logoGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <circle cx="50" cy="60" r="6" fill="url(#logoGradient)" />
            </svg>
        </div>
        <h1 style={styles.title}>Welcome to Inkline</h1>
        <p style={styles.subtitle}>
            Your AI-powered storytelling companion. Let's set up your
            experience.
        </p>
        <button style={styles.primaryButton} onClick={onNext}>
            Get Started
        </button>
    </div>
);

const FeaturesStep: React.FC<{
    config: SetupConfig;
    onUpdateConfig: (config: Partial<SetupConfig>) => void;
    onNext: () => void;
    onBack: () => void;
    isWindows: boolean;
}> = ({ config, onUpdateConfig, onNext, onBack, isWindows }) => {
    const toggleFeature = (feature: keyof SetupConfig["features"]) => {
        // Prevent enabling image/audio on non-Windows
        if (
            !isWindows &&
            (feature === "imageGeneration" || feature === "audioGeneration")
        ) {
            return;
        }
        onUpdateConfig({
            features: {
                ...config.features,
                [feature]: !config.features[feature],
            },
        });
    };

    const isLocalAiDisabled = !isWindows;

    return (
        <div style={styles.stepContainer}>
            <h2 style={styles.stepTitle}>Enable Features</h2>
            <p style={styles.stepDescription}>
                Choose which AI features you'd like to use. You can change these
                later in Settings.
            </p>

            {!isWindows && (
                <div style={styles.platformWarning}>
                    ⚠️ Local AI features (Image & Audio Generation) are only
                    available on Windows.
                </div>
            )}

            <div style={styles.featureList}>
                <div
                    style={{
                        ...styles.featureCard,
                        ...(config.features.aiChat
                            ? styles.featureCardActive
                            : {}),
                    }}
                    onClick={() => toggleFeature("aiChat")}
                >
                    <div style={styles.featureIcon}>💬</div>
                    <div style={styles.featureInfo}>
                        <h3 style={styles.featureName}>AI Chat & Editor</h3>
                        <p style={styles.featureDesc}>
                            Chat with AI about your story, get suggestions, and
                            use AI-powered editing tools.
                        </p>
                        <p style={styles.featureNote}>
                            ⚠️ Requires Gemini API key (add in Settings after
                            sign-in)
                        </p>
                    </div>
                    <div
                        style={{
                            ...styles.checkbox,
                            ...(config.features.aiChat
                                ? styles.checkboxActive
                                : {}),
                        }}
                    >
                        {config.features.aiChat && "✓"}
                    </div>
                </div>

                <div
                    style={{
                        ...styles.featureCard,
                        ...(config.features.imageGeneration
                            ? styles.featureCardActive
                            : {}),
                        ...(isLocalAiDisabled
                            ? styles.featureCardDisabled
                            : {}),
                    }}
                    onClick={() => toggleFeature("imageGeneration")}
                >
                    <div style={styles.featureIcon}>🎨</div>
                    <div style={styles.featureInfo}>
                        <h3 style={styles.featureName}>Image Generation</h3>
                        <p style={styles.featureDesc}>
                            Generate character portraits, location art, and
                            scene illustrations locally.
                        </p>
                        <p style={styles.featureNote}>
                            {isLocalAiDisabled
                                ? "🚫 Windows only"
                                : "📥 Requires ~10 GB download"}
                        </p>
                    </div>
                    <div
                        style={{
                            ...styles.checkbox,
                            ...(config.features.imageGeneration
                                ? styles.checkboxActive
                                : {}),
                            ...(isLocalAiDisabled
                                ? styles.checkboxDisabled
                                : {}),
                        }}
                    >
                        {config.features.imageGeneration && "✓"}
                    </div>
                </div>

                <div
                    style={{
                        ...styles.featureCard,
                        ...(config.features.audioGeneration
                            ? styles.featureCardActive
                            : {}),
                        ...(isLocalAiDisabled
                            ? styles.featureCardDisabled
                            : {}),
                    }}
                    onClick={() => toggleFeature("audioGeneration")}
                >
                    <div style={styles.featureIcon}>🎵</div>
                    <div style={styles.featureInfo}>
                        <h3 style={styles.featureName}>Audio Generation</h3>
                        <p style={styles.featureDesc}>
                            Create character themes, location ambience, and
                            background music locally.
                        </p>
                        <p style={styles.featureNote}>
                            {isLocalAiDisabled
                                ? "🚫 Windows only"
                                : "📥 Requires ~7.5 GB download"}
                        </p>
                    </div>
                    <div
                        style={{
                            ...styles.checkbox,
                            ...(config.features.audioGeneration
                                ? styles.checkboxActive
                                : {}),
                            ...(isLocalAiDisabled
                                ? styles.checkboxDisabled
                                : {}),
                        }}
                    >
                        {config.features.audioGeneration && "✓"}
                    </div>
                </div>
            </div>

            <div style={styles.buttonRow}>
                <button style={styles.secondaryButton} onClick={onBack}>
                    Back
                </button>
                <button style={styles.primaryButton} onClick={onNext}>
                    Continue
                </button>
            </div>
        </div>
    );
};

const DownloadsStep: React.FC<{
    config: SetupConfig;
    onNext: () => void;
    onBack: () => void;
}> = ({ config, onNext, onBack }) => {
    const [comfyProgress, setComfyProgress] = useState<DownloadProgress | null>(
        null,
    );
    const [imageProgress, setImageProgress] = useState<DownloadProgress | null>(
        null,
    );
    const [audioProgress, setAudioProgress] = useState<DownloadProgress | null>(
        null,
    );
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadStarted, setDownloadStarted] = useState(false);
    const [comfyUIInstalled, setComfyUIInstalled] = useState(false);
    const [wasCancelled, setWasCancelled] = useState(false);

    const needsImageDownload = config.features.imageGeneration;
    const needsAudioDownload = config.features.audioGeneration;
    const needsLocalAI = needsImageDownload || needsAudioDownload;

    // Check ComfyUI installation status
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const comfyStatus = await (
                    window as any
                ).setupApi.checkComfyUIStatus();
                setComfyUIInstalled(comfyStatus.installed);
            } catch {
                setComfyUIInstalled(false);
            }
        };
        checkStatus();
    }, []);

    useEffect(() => {
        // Listen for download progress updates
        const unsubscribe = (window as any).setupEvents?.onDownloadProgress(
            (progress: DownloadProgress) => {
                if (progress.downloadType === "comfyui") {
                    setComfyProgress(progress);
                    if (progress.status === "completed") {
                        setComfyUIInstalled(true);
                    }
                } else if (progress.downloadType === "image") {
                    setImageProgress(progress);
                } else if (progress.downloadType === "audio") {
                    setAudioProgress(progress);
                }
            },
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    const startDownloads = async () => {
        setIsDownloading(true);
        setDownloadStarted(true);
        setWasCancelled(false);

        try {
            // Initialize ComfyUI progress if needed
            if (needsLocalAI && !comfyUIInstalled) {
                setComfyProgress({
                    downloadType: "comfyui",
                    downloadedBytes: 0,
                    totalBytes: 0,
                    percentage: 0,
                    status: "pending",
                });
            }

            if (needsImageDownload) {
                setImageProgress({
                    downloadType: "image",
                    downloadedBytes: 0,
                    totalBytes: 0,
                    percentage: 0,
                    status: "pending",
                });
            }
            if (needsAudioDownload) {
                setAudioProgress({
                    downloadType: "audio",
                    downloadedBytes: 0,
                    totalBytes: 0,
                    percentage: 0,
                    status: "pending",
                });
            }

            await (window as any).setupApi.startDownloads({
                comfyui: needsLocalAI && !comfyUIInstalled,
                image: needsImageDownload,
                audio: needsAudioDownload,
                languagetool: false,
            });
        } catch (error) {
            console.error("Download error:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const cancelDownloads = async () => {
        try {
            // Only cancel AI downloads, not LanguageTool (which downloads in background)
            await (window as any).setupApi.cancelDownloads([
                "comfyui",
                "image",
                "audio",
            ]);
            // Reset progress states to show cancellation
            setComfyProgress(null);
            setImageProgress(null);
            setAudioProgress(null);
            setWasCancelled(true);
        } catch (error) {
            console.error("Cancel error:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const allDownloadsComplete =
        (!needsLocalAI ||
            comfyUIInstalled ||
            comfyProgress?.status === "completed") &&
        (!needsImageDownload || imageProgress?.status === "completed") &&
        (!needsAudioDownload || audioProgress?.status === "completed");

    const hasError =
        comfyProgress?.status === "error" ||
        imageProgress?.status === "error" ||
        audioProgress?.status === "error";

    // Check if any download is actively in progress (pending, downloading, or extracting)
    const isActivelyDownloading =
        comfyProgress?.status === "pending" ||
        comfyProgress?.status === "downloading" ||
        comfyProgress?.status === "extracting" ||
        imageProgress?.status === "pending" ||
        imageProgress?.status === "downloading" ||
        audioProgress?.status === "pending" ||
        audioProgress?.status === "downloading";

    const renderProgress = (
        progress: DownloadProgress | null,
        label: string,
    ) => {
        if (!progress) return null;

        return (
            <div style={styles.downloadItem}>
                <div style={styles.downloadHeader}>
                    <span style={styles.downloadLabel}>{label}</span>
                    <span style={styles.downloadStatus}>
                        {progress.status === "pending" && "Waiting..."}
                        {progress.status === "downloading" &&
                            `${progress.percentage}%`}
                        {progress.status === "extracting" &&
                            `Extracting... ${progress.percentage}%`}
                        {progress.status === "completed" && "✓ Complete"}
                        {progress.status === "error" &&
                            `❌ ${progress.error || "Error"}`}
                    </span>
                </div>
                <div style={styles.progressBarContainer}>
                    <div
                        style={{
                            ...styles.progressBar,
                            width: `${progress.percentage}%`,
                            backgroundColor:
                                progress.status === "error"
                                    ? "#e74c3c"
                                    : progress.status === "completed"
                                      ? "#50e39c"
                                      : progress.status === "extracting"
                                        ? "#f39c12"
                                        : "#4a90e2",
                        }}
                    />
                </div>
                {progress.status === "downloading" && (
                    <div style={styles.downloadDetails}>
                        {formatBytes(progress.downloadedBytes)} /{" "}
                        {formatBytes(progress.totalBytes)}
                    </div>
                )}
            </div>
        );
    };

    // Skip this step if no downloads needed
    if (!needsImageDownload && !needsAudioDownload) {
        return (
            <div style={styles.stepContainer}>
                <h2 style={styles.stepTitle}>No Downloads Required</h2>
                <p style={styles.stepDescription}>
                    You've chosen not to enable local AI features. You can
                    enable them later in Settings.
                </p>
                <div style={styles.buttonRow}>
                    <button style={styles.secondaryButton} onClick={onBack}>
                        Back
                    </button>
                    <button style={styles.primaryButton} onClick={onNext}>
                        Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.stepContainer}>
            <h2 style={styles.stepTitle}>Download AI Components</h2>
            <p style={styles.stepDescription}>
                The AI engine and models will be downloaded to your computer for
                local generation. This may take a while depending on your
                connection.
            </p>

            <div style={styles.downloadsList}>
                {needsLocalAI &&
                    !comfyUIInstalled &&
                    renderProgress(comfyProgress, "AI Engine (ComfyUI ~2 GB)")}
                {needsImageDownload &&
                    renderProgress(
                        imageProgress,
                        "Image Generation Model (~10 GB)",
                    )}
                {needsAudioDownload &&
                    renderProgress(
                        audioProgress,
                        "Audio Generation Model (~7.5 GB)",
                    )}
            </div>

            {comfyProgress?.status === "error" &&
                comfyProgress.error?.includes("7-Zip") && (
                    <div style={styles.errorNote}>
                        💡 Please install 7-Zip from{" "}
                        <a
                            href="https://7-zip.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={styles.link}
                        >
                            7-zip.org
                        </a>{" "}
                        and try again.
                    </div>
                )}

            {!downloadStarted && (
                <button
                    style={styles.primaryButton}
                    onClick={startDownloads}
                    disabled={isDownloading}
                >
                    Start Downloads
                </button>
            )}

            {downloadStarted && (
                <div style={styles.buttonRow}>
                    <button
                        style={styles.secondaryButton}
                        onClick={onBack}
                        disabled={isActivelyDownloading}
                    >
                        Back
                    </button>
                    {isActivelyDownloading && (
                        <button
                            style={styles.dangerButton}
                            onClick={cancelDownloads}
                        >
                            Cancel
                        </button>
                    )}
                    {wasCancelled && (
                        <>
                            <button
                                style={styles.secondaryButton}
                                onClick={startDownloads}
                            >
                                Retry
                            </button>
                            <button
                                style={styles.primaryButton}
                                onClick={onNext}
                            >
                                Skip
                            </button>
                        </>
                    )}
                    {hasError && (
                        <button
                            style={styles.primaryButton}
                            onClick={startDownloads}
                        >
                            Retry
                        </button>
                    )}
                    {allDownloadsComplete && (
                        <button style={styles.primaryButton} onClick={onNext}>
                            Continue
                        </button>
                    )}
                </div>
            )}

            {isActivelyDownloading && (
                <p style={styles.downloadNote}>
                    Please keep this window open while downloading. You can use
                    other applications.
                </p>
            )}

            {wasCancelled && (
                <p style={styles.downloadNote}>
                    Downloads have been cancelled. You can retry or skip this
                    step.
                </p>
            )}
        </div>
    );
};

// Friendly messages for the finalizing spinner
const FINALIZING_MESSAGES = [
    "Adding final touches...",
    "Setting up your writing tools...",
    "Preparing your workspace...",
    "Almost ready...",
    "Configuring grammar checker...",
    "Just a moment...",
];

const FinalizingStep: React.FC<{
    onNext: () => void;
}> = ({ onNext }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    const [status, setStatus] = useState<"loading" | "complete" | "error">(
        "loading",
    );
    const [error, setError] = useState<string | null>(null);
    const [downloadProgress, setDownloadProgress] =
        useState<DownloadProgress | null>(null);
    const onNextRef = React.useRef(onNext);
    onNextRef.current = onNext;

    // Single consolidated effect: check status, set up listener, handle completion
    useEffect(() => {
        let isSubscribed = true;

        // Set up progress listener FIRST (before any async checks)
        const unsubscribe = (window as any).setupEvents?.onDownloadProgress(
            (progress: DownloadProgress) => {
                if (!isSubscribed) return;
                if (progress.downloadType === "languagetool") {
                    setDownloadProgress(progress);
                    if (progress.status === "completed") {
                        setStatus("complete");
                    } else if (progress.status === "error") {
                        setError(progress.error || "Download failed");
                        setStatus("error");
                    }
                }
            },
        );

        // Check current status (download was already started at wizard open)
        const checkStatus = async () => {
            try {
                const [platformInfo, ltStatus] = await Promise.all([
                    (window as any).setupApi.checkPlatform(),
                    (window as any).setupApi.checkLanguageToolStatus(),
                ]);

                if (!isSubscribed) return;

                // If not Windows or already installed, we're done
                if (!platformInfo.isWindows || ltStatus.installed) {
                    setStatus("complete");
                }
                // Otherwise, wait for the background download to complete via listener
            } catch (err) {
                if (!isSubscribed) return;
                console.error("Finalization check error:", err);
                setError(err instanceof Error ? err.message : "Unknown error");
                setStatus("error");
            }
        };

        checkStatus();

        return () => {
            isSubscribed = false;
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // Rotate through messages while loading
    useEffect(() => {
        if (status !== "loading") return;

        const interval = setInterval(() => {
            setCurrentMessageIndex(
                (prev) => (prev + 1) % FINALIZING_MESSAGES.length,
            );
        }, 2500);

        return () => clearInterval(interval);
    }, [status]);

    // Auto-advance when complete (use ref to avoid dependency on onNext)
    useEffect(() => {
        if (status === "complete") {
            const timeout = setTimeout(() => onNextRef.current(), 500);
            return () => clearTimeout(timeout);
        }
    }, [status]);

    return (
        <div style={styles.stepContainer}>
            <div style={styles.finalizingContent}>
                {status === "loading" && (
                    <>
                        <div style={styles.spinner}>
                            <svg
                                width="48"
                                height="48"
                                viewBox="0 0 48 48"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                style={{ animation: "spin 1s linear infinite" }}
                            >
                                <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    stroke="#3a3b3e"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    d="M24 4C12.954 4 4 12.954 4 24"
                                    stroke="#4a90e2"
                                    strokeWidth="4"
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </svg>
                        </div>
                        <h2 style={styles.stepTitle}>
                            {FINALIZING_MESSAGES[currentMessageIndex]}
                        </h2>
                        <p style={styles.stepDescription}>
                            This will only take a moment.
                        </p>
                        {downloadProgress &&
                            (downloadProgress.status === "downloading" ||
                                downloadProgress.status === "extracting") && (
                                <div style={styles.finalizingProgressContainer}>
                                    <div style={styles.progressBarContainer}>
                                        <div
                                            style={{
                                                ...styles.progressBar,
                                                width: `${downloadProgress.percentage}%`,
                                                backgroundColor:
                                                    downloadProgress.status ===
                                                    "extracting"
                                                        ? "#f39c12"
                                                        : "#4a90e2",
                                            }}
                                        />
                                    </div>
                                    <div style={styles.finalizingProgressText}>
                                        {downloadProgress.status ===
                                        "extracting"
                                            ? `Extracting... ${downloadProgress.percentage}%`
                                            : `${downloadProgress.percentage}%`}
                                    </div>
                                </div>
                            )}
                    </>
                )}

                {status === "complete" && (
                    <>
                        <div style={styles.successIcon}>✨</div>
                        <h2 style={styles.stepTitle}>All set!</h2>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div style={styles.errorIcon}>⚠️</div>
                        <h2 style={styles.stepTitle}>Something went wrong</h2>
                        <p style={styles.stepDescription}>
                            {error ||
                                "Failed to complete setup. You can continue anyway."}
                        </p>
                        <button style={styles.primaryButton} onClick={onNext}>
                            Continue Anyway
                        </button>
                    </>
                )}
            </div>

            {/* CSS animation for spinner */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

const ThemeStep: React.FC<{
    config: SetupConfig;
    onUpdateConfig: (config: Partial<SetupConfig>) => void;
    onNext: () => void;
    onBack: () => void;
}> = ({ config, onUpdateConfig, onNext, onBack }) => {
    const setColorScheme = (colorScheme: "dark" | "light") => {
        onUpdateConfig({
            theme: { ...config.theme, colorScheme },
        });
    };

    const setAccentColor = (accentColor: string) => {
        onUpdateConfig({
            theme: { ...config.theme, accentColor },
        });
    };

    return (
        <div style={styles.stepContainer}>
            <h2 style={styles.stepTitle}>Choose Your Theme</h2>
            <p style={styles.stepDescription}>
                Customize the look and feel of Inkline. You can change this
                anytime in Settings.
            </p>

            <div style={styles.themeSection}>
                <h3 style={styles.themeSectionTitle}>Color Scheme</h3>
                <div style={styles.schemeOptions}>
                    <div
                        style={{
                            ...styles.schemeOption,
                            ...(config.theme.colorScheme === "dark"
                                ? styles.schemeOptionActive
                                : {}),
                        }}
                        onClick={() => setColorScheme("dark")}
                    >
                        <div
                            style={{
                                ...styles.schemePreview,
                                backgroundColor: "#1a1b1e",
                            }}
                        >
                            <div
                                style={{
                                    ...styles.schemePreviewInner,
                                    backgroundColor: "#2a2b2e",
                                }}
                            />
                        </div>
                        <span>Dark</span>
                    </div>
                    <div
                        style={{
                            ...styles.schemeOption,
                            ...(config.theme.colorScheme === "light"
                                ? styles.schemeOptionActive
                                : {}),
                        }}
                        onClick={() => setColorScheme("light")}
                    >
                        <div
                            style={{
                                ...styles.schemePreview,
                                backgroundColor: "#f5f5f5",
                            }}
                        >
                            <div
                                style={{
                                    ...styles.schemePreviewInner,
                                    backgroundColor: "#ffffff",
                                }}
                            />
                        </div>
                        <span>Light</span>
                    </div>
                </div>
            </div>

            <div style={styles.themeSection}>
                <h3 style={styles.themeSectionTitle}>Accent Color</h3>
                <div style={styles.colorOptions}>
                    {ACCENT_COLORS.map((color) => (
                        <div
                            key={color.value}
                            style={{
                                ...styles.colorOption,
                                backgroundColor: color.value,
                                ...(config.theme.accentColor === color.value
                                    ? styles.colorOptionActive
                                    : {}),
                            }}
                            onClick={() => setAccentColor(color.value)}
                            title={color.name}
                        >
                            {config.theme.accentColor === color.value && (
                                <span style={styles.colorCheck}>✓</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div style={styles.buttonRow}>
                <button style={styles.secondaryButton} onClick={onBack}>
                    Back
                </button>
                <button style={styles.primaryButton} onClick={onNext}>
                    Continue
                </button>
            </div>
        </div>
    );
};

const CompleteStep: React.FC<{
    config: SetupConfig;
    onComplete: () => void;
}> = ({ config, onComplete }) => (
    <div style={styles.stepContainer}>
        <div style={styles.successIcon}>🎉</div>
        <h2 style={styles.stepTitle}>You're All Set!</h2>
        <p style={styles.stepDescription}>
            Inkline is ready to help you tell your stories.
        </p>

        <div style={styles.summaryBox}>
            <h4 style={styles.summaryTitle}>Your Setup Summary</h4>
            <ul style={styles.summaryList}>
                <li>
                    AI Chat & Editor:{" "}
                    {config.features.aiChat ? "✅ Enabled" : "❌ Disabled"}
                </li>
                <li>
                    Image Generation:{" "}
                    {config.features.imageGeneration
                        ? "✅ Enabled"
                        : "❌ Disabled"}
                </li>
                <li>
                    Audio Generation:{" "}
                    {config.features.audioGeneration
                        ? "✅ Enabled"
                        : "❌ Disabled"}
                </li>
                <li>
                    Theme:{" "}
                    {config.theme.colorScheme === "dark"
                        ? "🌙 Dark"
                        : "☀️ Light"}
                </li>
            </ul>
            {config.features.aiChat && (
                <p style={styles.reminderNote}>
                    💡 Remember to add your Gemini API key in Settings after
                    signing in!
                </p>
            )}
        </div>

        <button style={styles.primaryButton} onClick={onComplete}>
            Launch Inkline
        </button>
    </div>
);

// Main Setup Wizard Component
const SetupWizard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
    const [isWindows, setIsWindows] = useState(true);
    const [config, setConfig] = useState<SetupConfig>({
        features: {
            aiChat: true,
            imageGeneration: false,
            audioGeneration: false,
        },
        theme: {
            colorScheme: "dark",
            accentColor: "#4a90e2",
        },
    });

    // Check platform and start LanguageTool download in background on mount
    useEffect(() => {
        let isSubscribed = true;

        const initializeWizard = async () => {
            try {
                const [platformInfo, ltStatus] = await Promise.all([
                    (window as any).setupApi.checkPlatform(),
                    (window as any).setupApi.checkLanguageToolStatus(),
                ]);

                if (!isSubscribed) return;
                setIsWindows(platformInfo.isWindows);

                // Start LanguageTool download in background if needed (Windows only)
                if (platformInfo.isWindows && !ltStatus.installed) {
                    // Fire and forget - don't await, let it download in background
                    (window as any).setupApi
                        .startDownloads({
                            comfyui: false,
                            image: false,
                            audio: false,
                            languagetool: true,
                        })
                        .catch((err: Error) => {
                            console.error(
                                "Background LanguageTool download failed:",
                                err,
                            );
                        });
                }
            } catch {
                // Default to true if check fails
                if (isSubscribed) setIsWindows(true);
            }
        };

        initializeWizard();

        return () => {
            isSubscribed = false;
        };
    }, []);

    const updateConfig = useCallback((updates: Partial<SetupConfig>) => {
        setConfig((prev) => ({
            ...prev,
            ...updates,
            features: {
                ...prev.features,
                ...(updates.features || {}),
            },
            theme: {
                ...prev.theme,
                ...(updates.theme || {}),
            },
        }));
    }, []);

    const handleComplete = async () => {
        try {
            await (window as any).setupApi.completeSetup(config);
        } catch (error) {
            console.error("Failed to complete setup:", error);
        }
    };

    const steps: SetupStep[] = [
        "welcome",
        "features",
        "downloads",
        "finalizing",
        "theme",
        "complete",
    ];
    const currentIndex = steps.indexOf(currentStep);

    const goNext = useCallback(() => {
        setCurrentStep((prev) => {
            const idx = steps.indexOf(prev);
            return idx < steps.length - 1 ? steps[idx + 1] : prev;
        });
    }, []);

    const goBack = useCallback(() => {
        setCurrentStep((prev) => {
            const idx = steps.indexOf(prev);
            return idx > 0 ? steps[idx - 1] : prev;
        });
    }, []);

    return (
        <div style={styles.container}>
            {/* Progress indicator */}
            <div style={styles.progressIndicator}>
                {steps.map((step, index) => (
                    <React.Fragment key={step}>
                        <div
                            style={{
                                ...styles.progressDot,
                                ...(index <= currentIndex
                                    ? styles.progressDotActive
                                    : {}),
                            }}
                        />
                        {index < steps.length - 1 && (
                            <div
                                style={{
                                    ...styles.progressLine,
                                    ...(index < currentIndex
                                        ? styles.progressLineActive
                                        : {}),
                                }}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Step content */}
            <div style={styles.content}>
                {currentStep === "welcome" && <WelcomeStep onNext={goNext} />}
                {currentStep === "features" && (
                    <FeaturesStep
                        config={config}
                        onUpdateConfig={updateConfig}
                        onNext={goNext}
                        onBack={goBack}
                        isWindows={isWindows}
                    />
                )}
                {currentStep === "downloads" && (
                    <DownloadsStep
                        config={config}
                        onNext={goNext}
                        onBack={goBack}
                    />
                )}
                {currentStep === "finalizing" && (
                    <FinalizingStep onNext={goNext} />
                )}
                {currentStep === "theme" && (
                    <ThemeStep
                        config={config}
                        onUpdateConfig={updateConfig}
                        onNext={goNext}
                        onBack={goBack}
                    />
                )}
                {currentStep === "complete" && (
                    <CompleteStep config={config} onComplete={handleComplete} />
                )}
            </div>
        </div>
    );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#1a1b1e",
        padding: "24px",
    },
    progressIndicator: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 0",
        marginBottom: "24px",
    },
    progressDot: {
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        backgroundColor: "#3a3b3e",
        transition: "background-color 0.3s ease",
    },
    progressDotActive: {
        backgroundColor: "#4a90e2",
    },
    progressLine: {
        width: "40px",
        height: "2px",
        backgroundColor: "#3a3b3e",
        margin: "0 4px",
        transition: "background-color 0.3s ease",
    },
    progressLineActive: {
        backgroundColor: "#4a90e2",
    },
    content: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "auto",
    },
    stepContainer: {
        maxWidth: "500px",
        width: "100%",
        textAlign: "center",
    },
    logoContainer: {
        marginBottom: "24px",
    },
    title: {
        fontSize: "28px",
        fontWeight: 600,
        marginBottom: "12px",
        color: "#f6f7fb",
    },
    subtitle: {
        fontSize: "16px",
        color: "#8a8b8e",
        marginBottom: "32px",
        lineHeight: 1.5,
    },
    stepTitle: {
        fontSize: "24px",
        fontWeight: 600,
        marginBottom: "12px",
        color: "#f6f7fb",
    },
    stepDescription: {
        fontSize: "14px",
        color: "#8a8b8e",
        marginBottom: "24px",
        lineHeight: 1.5,
    },
    primaryButton: {
        backgroundColor: "#4a90e2",
        color: "#fff",
        border: "none",
        padding: "12px 32px",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background-color 0.2s ease",
    },
    secondaryButton: {
        backgroundColor: "transparent",
        color: "#8a8b8e",
        border: "1px solid #3a3b3e",
        padding: "12px 32px",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    dangerButton: {
        backgroundColor: "#e74c3c",
        color: "#fff",
        border: "none",
        padding: "12px 32px",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background-color 0.2s ease",
    },
    buttonRow: {
        display: "flex",
        justifyContent: "center",
        gap: "16px",
        marginTop: "24px",
    },
    featureList: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        marginBottom: "24px",
        textAlign: "left",
    },
    featureCard: {
        display: "flex",
        alignItems: "flex-start",
        padding: "16px",
        borderRadius: "12px",
        backgroundColor: "#2a2b2e",
        border: "2px solid transparent",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    featureCardActive: {
        borderColor: "#4a90e2",
        backgroundColor: "rgba(74, 144, 226, 0.1)",
    },
    featureIcon: {
        fontSize: "24px",
        marginRight: "16px",
    },
    featureInfo: {
        flex: 1,
    },
    featureName: {
        fontSize: "16px",
        fontWeight: 600,
        color: "#f6f7fb",
        marginBottom: "4px",
    },
    featureDesc: {
        fontSize: "13px",
        color: "#8a8b8e",
        lineHeight: 1.4,
        marginBottom: "8px",
    },
    featureNote: {
        fontSize: "12px",
        color: "#6a6b6e",
    },
    checkbox: {
        width: "24px",
        height: "24px",
        borderRadius: "6px",
        border: "2px solid #3a3b3e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "14px",
        flexShrink: 0,
    },
    checkboxActive: {
        backgroundColor: "#4a90e2",
        borderColor: "#4a90e2",
    },
    downloadsList: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        marginBottom: "24px",
    },
    downloadItem: {
        backgroundColor: "#2a2b2e",
        padding: "16px",
        borderRadius: "12px",
        textAlign: "left",
    },
    downloadHeader: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "8px",
    },
    downloadLabel: {
        fontSize: "14px",
        color: "#f6f7fb",
    },
    downloadStatus: {
        fontSize: "14px",
        color: "#8a8b8e",
    },
    progressBarContainer: {
        height: "8px",
        backgroundColor: "#1a1b1e",
        borderRadius: "4px",
        overflow: "hidden",
    },
    progressBar: {
        height: "100%",
        borderRadius: "4px",
        transition: "width 0.3s ease",
    },
    downloadDetails: {
        fontSize: "12px",
        color: "#6a6b6e",
        marginTop: "8px",
    },
    downloadNote: {
        fontSize: "13px",
        color: "#6a6b6e",
        marginTop: "16px",
    },
    themeSection: {
        marginBottom: "24px",
        textAlign: "left",
    },
    themeSectionTitle: {
        fontSize: "14px",
        fontWeight: 500,
        color: "#f6f7fb",
        marginBottom: "12px",
    },
    schemeOptions: {
        display: "flex",
        gap: "16px",
    },
    schemeOption: {
        flex: 1,
        padding: "16px",
        borderRadius: "12px",
        backgroundColor: "#2a2b2e",
        border: "2px solid transparent",
        cursor: "pointer",
        textAlign: "center",
        transition: "all 0.2s ease",
    },
    schemeOptionActive: {
        borderColor: "#4a90e2",
    },
    schemePreview: {
        width: "100%",
        height: "60px",
        borderRadius: "8px",
        marginBottom: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    schemePreviewInner: {
        width: "60%",
        height: "40px",
        borderRadius: "4px",
    },
    colorOptions: {
        display: "flex",
        gap: "12px",
        flexWrap: "wrap",
    },
    colorOption: {
        width: "48px",
        height: "48px",
        borderRadius: "12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "transform 0.2s ease",
    },
    colorOptionActive: {
        transform: "scale(1.1)",
        boxShadow: "0 0 0 3px rgba(255,255,255,0.3)",
    },
    colorCheck: {
        color: "#fff",
        fontSize: "18px",
        fontWeight: "bold",
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
    },
    successIcon: {
        fontSize: "64px",
        marginBottom: "24px",
    },
    summaryBox: {
        backgroundColor: "#2a2b2e",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        textAlign: "left",
    },
    summaryTitle: {
        fontSize: "14px",
        fontWeight: 500,
        color: "#f6f7fb",
        marginBottom: "12px",
    },
    summaryList: {
        listStyle: "none",
        padding: 0,
        margin: 0,
        fontSize: "14px",
        color: "#8a8b8e",
        lineHeight: 2,
    },
    reminderNote: {
        fontSize: "13px",
        color: "#e67e22",
        marginTop: "12px",
        paddingTop: "12px",
        borderTop: "1px solid #3a3b3e",
    },
    platformWarning: {
        backgroundColor: "rgba(231, 76, 60, 0.1)",
        border: "1px solid rgba(231, 76, 60, 0.3)",
        borderRadius: "8px",
        padding: "12px 16px",
        fontSize: "13px",
        color: "#e74c3c",
        marginBottom: "16px",
        textAlign: "left",
    },
    featureCardDisabled: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
    checkboxDisabled: {
        backgroundColor: "#3a3b3e",
        borderColor: "#3a3b3e",
    },
    errorNote: {
        backgroundColor: "rgba(231, 76, 60, 0.1)",
        border: "1px solid rgba(231, 76, 60, 0.3)",
        borderRadius: "8px",
        padding: "12px 16px",
        fontSize: "13px",
        color: "#e74c3c",
        marginTop: "16px",
        textAlign: "left",
    },
    link: {
        color: "#4a90e2",
        textDecoration: "underline",
    },
    // Finalizing step styles
    finalizingContent: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "200px",
    },
    spinner: {
        marginBottom: "24px",
    },
    errorIcon: {
        fontSize: "64px",
        marginBottom: "24px",
    },
    finalizingProgressContainer: {
        width: "100%",
        maxWidth: "300px",
        marginTop: "16px",
    },
    finalizingProgressText: {
        fontSize: "12px",
        color: "#6a6b6e",
        marginTop: "8px",
        textAlign: "center",
    },
};

// Mount the app
const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<SetupWizard />);
}
