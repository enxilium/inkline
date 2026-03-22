import React, { useState, useCallback, useEffect } from "react";
import { createRoot } from "react-dom/client";
import ReactMarkdown from "react-markdown";
import strokeLargeLogo from "../../../../assets/stroke-large.png";
import inkyLargeIcon from "../../../../assets/icons/inky-large.png";
import genAiIcon from "../../../../assets/icons/gen-ai.png";
import musicIcon from "../../../../assets/icons/music.png";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckIcon from "@mui/icons-material/Check";
import BlockIcon from "@mui/icons-material/Block";
import DownloadIcon from "@mui/icons-material/Download";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import InfoIcon from "@mui/icons-material/Info";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { normalizeUserFacingError } from "../../utils/userFacingError";

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
    legalAccepted: boolean;
    legalAcceptedAt: string | null;
    legalVersion: string;
}

interface LegalPoliciesResponse {
    markdown: string;
    legalVersion: string;
}

type SetupApi = {
    checkPlatform: () => Promise<{ platform: string; isWindows: boolean }>;
    checkComfyUIStatus: () => Promise<{ installed: boolean }>;
    checkLanguageToolStatus: () => Promise<{ installed: boolean }>;
    startDownloads: (request: {
        comfyui: boolean;
        image: boolean;
        audio: boolean;
        languagetool: boolean;
    }) => Promise<void>;
    cancelDownloads: (
        types: Array<"comfyui" | "image" | "audio">,
    ) => Promise<void>;
    getLegalPolicies: () => Promise<LegalPoliciesResponse>;
    completeSetup: (config: SetupConfig) => Promise<void>;
    closeWindow: () => void;
};

type SetupEvents = {
    onDownloadProgress?: (
        listener: (progress: DownloadProgress) => void,
    ) => (() => void) | void;
};

const setupApi = (): SetupApi =>
    (window as unknown as { setupApi: SetupApi }).setupApi;

const setupEvents = (): SetupEvents =>
    (window as unknown as { setupEvents?: SetupEvents }).setupEvents ?? {};

type SetupStep =
    | "welcome"
    | "features"
    | "legal"
    | "downloads"
    | "finalizing"
    | "complete";

// Helper to format bytes
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const getSetupFriendlyError = (
    error: unknown,
    fallback: string,
    status?: DownloadProgress["status"],
): string => {
    const context =
        status === "extracting" ? "setup-extraction" : "setup-download";
    return normalizeUserFacingError(error, fallback, context);
};

// Step Components
const WelcomeStep: React.FC<{ onNext: () => void }> = ({ onNext }) => (
    <div style={styles.stepContainer}>
        <div style={styles.logoContainer}>
            <img
                src={strokeLargeLogo}
                alt="Inkline Logo"
                style={{ width: "80px", height: "80px", objectFit: "contain" }}
            />
        </div>
        <h1 style={styles.title}>Welcome to Inkline</h1>
        <p style={styles.subtitle}>
            Your modern storytelling companion. <br></br>Let's set up your
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
            <h2 style={styles.stepTitle}>Opt-In AI Features</h2>
            <p style={styles.stepDescription}>
                Choose which AI features you'd like to use, or skip altogether.
                You can change these later in Settings.
            </p>

            {!isWindows && (
                <div style={styles.platformWarning}>
                    <WarningAmberIcon
                        style={{
                            fontSize: 16,
                            verticalAlign: "middle",
                            marginRight: 6,
                        }}
                    />
                    Local AI features (Image &amp; Audio Generation) are only
                    available on Windows.
                </div>
            )}

            <div style={styles.featureList}>
                <div
                    style={{
                        ...styles.featureCard,
                        ...(config.features.aiChat
                            ? styles.featureCardActive
                            : styles.featureCardInactive),
                    }}
                    onClick={() => toggleFeature("aiChat")}
                >
                    <div style={styles.featureIcon}>
                        <img
                            src={inkyLargeIcon}
                            alt="AI Chat Icon"
                            style={{
                                width: "24px",
                                height: "24px",
                                objectFit: "contain",
                            }}
                        />
                    </div>
                    <div style={styles.featureInfo}>
                        <h3 style={styles.featureName}>AI Chat & Editor</h3>
                        <p style={styles.featureDesc}>
                            Chat with AI about your story, get suggestions, and
                            use AI-powered editing tools.
                        </p>
                        <p style={styles.featureNote}>
                            <WarningAmberIcon
                                style={{
                                    fontSize: 13,
                                    verticalAlign: "middle",
                                    marginRight: 4,
                                }}
                            />
                            Requires Gemini API key (add in Settings after
                            sign-in)
                        </p>
                    </div>
                    <div
                        style={{
                            ...styles.checkbox,
                            ...(config.features.aiChat
                                ? styles.checkboxActive
                                : styles.checkboxInactive),
                        }}
                    >
                        {config.features.aiChat && (
                            <CheckIcon style={{ fontSize: 16 }} />
                        )}
                    </div>
                </div>

                <div
                    style={{
                        ...styles.featureCard,
                        ...(config.features.imageGeneration
                            ? styles.featureCardActive
                            : styles.featureCardInactive),
                        ...(isLocalAiDisabled
                            ? styles.featureCardDisabled
                            : {}),
                    }}
                    onClick={() => toggleFeature("imageGeneration")}
                >
                    <div style={styles.featureIcon}>
                        <img
                            src={genAiIcon}
                            alt="Image Generation Icon"
                            style={{
                                width: "24px",
                                height: "24px",
                                objectFit: "contain",
                            }}
                        />
                    </div>
                    <div style={styles.featureInfo}>
                        <h3 style={styles.featureName}>Image Generation</h3>
                        <p style={styles.featureDesc}>
                            Generate character portraits, location art, and
                            scene illustrations locally.
                        </p>
                        <p style={styles.featureNote}>
                            {isLocalAiDisabled ? (
                                <>
                                    <BlockIcon
                                        style={{
                                            fontSize: 13,
                                            verticalAlign: "middle",
                                            marginRight: 4,
                                        }}
                                    />
                                    Windows only
                                </>
                            ) : (
                                <>
                                    <DownloadIcon
                                        style={{
                                            fontSize: 13,
                                            verticalAlign: "middle",
                                            marginRight: 4,
                                        }}
                                    />
                                    Requires ~10 GB download
                                </>
                            )}
                        </p>
                    </div>
                    <div
                        style={{
                            ...styles.checkbox,
                            ...(config.features.imageGeneration
                                ? styles.checkboxActive
                                : styles.checkboxInactive),
                            ...(isLocalAiDisabled
                                ? styles.checkboxDisabled
                                : {}),
                        }}
                    >
                        {config.features.imageGeneration && (
                            <CheckIcon style={{ fontSize: 16 }} />
                        )}
                    </div>
                </div>

                <div
                    style={{
                        ...styles.featureCard,
                        ...(config.features.audioGeneration
                            ? styles.featureCardActive
                            : styles.featureCardInactive),
                        ...(isLocalAiDisabled
                            ? styles.featureCardDisabled
                            : {}),
                    }}
                    onClick={() => toggleFeature("audioGeneration")}
                >
                    <div style={styles.featureIcon}>
                        <img
                            src={musicIcon}
                            alt="Audio Generation Icon"
                            style={{
                                width: "24px",
                                height: "24px",
                                objectFit: "contain",
                            }}
                        />
                    </div>
                    <div style={styles.featureInfo}>
                        <h3 style={styles.featureName}>Audio Generation</h3>
                        <p style={styles.featureDesc}>
                            Create character themes, location ambience, and
                            background music locally.
                        </p>
                        <p style={styles.featureNote}>
                            {isLocalAiDisabled ? (
                                <>
                                    <BlockIcon
                                        style={{
                                            fontSize: 13,
                                            verticalAlign: "middle",
                                            marginRight: 4,
                                        }}
                                    />
                                    Windows only
                                </>
                            ) : (
                                <>
                                    <DownloadIcon
                                        style={{
                                            fontSize: 13,
                                            verticalAlign: "middle",
                                            marginRight: 4,
                                        }}
                                    />
                                    Requires ~7.5 GB download
                                </>
                            )}
                        </p>
                    </div>
                    <div
                        style={{
                            ...styles.checkbox,
                            ...(config.features.audioGeneration
                                ? styles.checkboxActive
                                : styles.checkboxInactive),
                            ...(isLocalAiDisabled
                                ? styles.checkboxDisabled
                                : {}),
                        }}
                    >
                        {config.features.audioGeneration && (
                            <CheckIcon style={{ fontSize: 16 }} />
                        )}
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

const LegalStep: React.FC<{
    policies: LegalPoliciesResponse | null;
    isLoading: boolean;
    error: string | null;
    hasScrolledToEnd: boolean;
    hasAccepted: boolean;
    onScrolledToEnd: () => void;
    onAcceptedChange: (accepted: boolean) => void;
    onNext: () => void;
    onBack: () => void;
}> = ({
    policies,
    isLoading,
    error,
    hasScrolledToEnd,
    hasAccepted,
    onScrolledToEnd,
    onAcceptedChange,
    onNext,
    onBack,
}) => {
    const canContinue =
        !isLoading &&
        !error &&
        Boolean(policies) &&
        hasScrolledToEnd &&
        hasAccepted;

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        if (hasScrolledToEnd) {
            return;
        }

        const element = event.currentTarget;
        const scrollOffset =
            element.scrollHeight - element.scrollTop - element.clientHeight;
        if (scrollOffset <= 8) {
            onScrolledToEnd();
        }
    };

    return (
        <div style={styles.stepContainer}>
            <h2 style={styles.stepTitle}>Terms and Privacy</h2>
            <p style={styles.stepDescription}>
                Review and accept the Terms of Service and Privacy Policy to
                continue setup.
            </p>

            {isLoading && (
                <p style={styles.downloadNote}>Loading legal policies...</p>
            )}

            {error && <div style={styles.errorNote}>{error}</div>}

            {policies && !error && (
                <>
                    <div style={styles.summaryBox}>
                        <div
                            style={styles.legalScrollBox}
                            onScroll={handleScroll}
                        >
                            <div style={styles.legalMarkdown}>
                                <ReactMarkdown
                                    components={{
                                        h1: ({ children }) => (
                                            <h3
                                                style={
                                                    styles.legalHeadingPrimary
                                                }
                                            >
                                                {children}
                                            </h3>
                                        ),
                                        h2: ({ children }) => (
                                            <h4
                                                style={
                                                    styles.legalHeadingSecondary
                                                }
                                            >
                                                {children}
                                            </h4>
                                        ),
                                        p: ({ children }) => (
                                            <p style={styles.legalParagraph}>
                                                {children}
                                            </p>
                                        ),
                                        li: ({ children }) => (
                                            <li style={styles.legalListItem}>
                                                {children}
                                            </li>
                                        ),
                                        hr: () => (
                                            <hr style={styles.legalDivider} />
                                        ),
                                    }}
                                >
                                    {policies.markdown}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                    {!hasScrolledToEnd && (
                        <p style={styles.featureNote}>
                            Scroll to the end of the legal text to enable
                            acceptance.
                        </p>
                    )}
                    <label style={styles.legalCheckboxRow}>
                        <input
                            type="checkbox"
                            checked={hasAccepted}
                            disabled={!hasScrolledToEnd}
                            onChange={(event) =>
                                onAcceptedChange(event.target.checked)
                            }
                            style={styles.legalCheckboxInput}
                        />
                        I agree to the Terms of Service and Privacy Policy.
                    </label>
                </>
            )}

            <div style={styles.buttonRow}>
                <button style={styles.secondaryButton} onClick={onBack}>
                    Back
                </button>
                <button
                    style={{
                        ...styles.primaryButton,
                        ...(!canContinue ? styles.primaryButtonDisabled : {}),
                    }}
                    onClick={onNext}
                    disabled={!canContinue}
                >
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
                const comfyStatus = await setupApi().checkComfyUIStatus();
                setComfyUIInstalled(comfyStatus.installed);
            } catch {
                setComfyUIInstalled(false);
            }
        };
        checkStatus();
    }, []);

    useEffect(() => {
        // Listen for download progress updates
        const unsubscribe = setupEvents().onDownloadProgress?.(
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

            await setupApi().startDownloads({
                comfyui: needsLocalAI && !comfyUIInstalled,
                image: needsImageDownload,
                audio: needsAudioDownload,
                languagetool: false,
            });
        } catch (error) {
            console.error("Download error:", error);
            const message = getSetupFriendlyError(
                error,
                "Download failed. Check your connection and retry.",
            );

            setComfyProgress((prev) =>
                prev
                    ? {
                          ...prev,
                          status: "error",
                          error: message,
                      }
                    : prev,
            );
            setImageProgress((prev) =>
                prev
                    ? {
                          ...prev,
                          status: "error",
                          error: message,
                      }
                    : prev,
            );
            setAudioProgress((prev) =>
                prev
                    ? {
                          ...prev,
                          status: "error",
                          error: message,
                      }
                    : prev,
            );
        } finally {
            setIsDownloading(false);
        }
    };

    const cancelDownloads = async () => {
        try {
            // Only cancel AI downloads, not LanguageTool (which downloads in background)
            await setupApi().cancelDownloads(["comfyui", "image", "audio"]);
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
                        {progress.status === "completed" && (
                            <>
                                <CheckCircleIcon
                                    style={{
                                        fontSize: 13,
                                        verticalAlign: "middle",
                                        marginRight: 4,
                                    }}
                                />
                                Complete
                            </>
                        )}
                        {progress.status === "error" && (
                            <>
                                <CancelIcon
                                    style={{
                                        fontSize: 13,
                                        verticalAlign: "middle",
                                        marginRight: 4,
                                    }}
                                />
                                {getSetupFriendlyError(
                                    progress.error,
                                    "Download failed.",
                                    progress.status,
                                )}
                            </>
                        )}
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
                                      ? "#2ef6ad"
                                      : progress.status === "extracting"
                                        ? "#f39c12"
                                        : "#2ef6ad",
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
                    You've chosen not to enable local AI features. <br></br>You
                    can enable them later in Settings.
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
                (comfyProgress.error?.toLowerCase().includes("7-zip") ||
                    comfyProgress.error?.toLowerCase().includes("7za")) && (
                    <div style={styles.errorNote}>
                        <InfoIcon
                            style={{
                                fontSize: 14,
                                verticalAlign: "middle",
                                marginRight: 6,
                            }}
                        />
                        Please install 7-Zip from{" "}
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
                <div style={styles.buttonRow}>
                    <button style={styles.secondaryButton} onClick={onBack}>
                        Back
                    </button>
                    <button
                        style={styles.primaryButton}
                        onClick={startDownloads}
                        disabled={isDownloading}
                    >
                        Start Downloads
                    </button>
                </div>
            )}

            {downloadStarted && (
                <div style={styles.buttonRow}>
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
                                onClick={onBack}
                            >
                                Back
                            </button>
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
                    {hasError && !wasCancelled && (
                        <>
                            <button
                                style={styles.secondaryButton}
                                onClick={onBack}
                            >
                                Back
                            </button>
                            <button
                                style={styles.primaryButton}
                                onClick={startDownloads}
                            >
                                Retry
                            </button>
                        </>
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
        const unsubscribe = setupEvents().onDownloadProgress?.(
            (progress: DownloadProgress) => {
                if (!isSubscribed) return;
                if (progress.downloadType === "languagetool") {
                    setDownloadProgress(progress);
                    if (progress.status === "completed") {
                        setStatus("complete");
                    } else if (progress.status === "error") {
                        setError(
                            getSetupFriendlyError(
                                progress.error,
                                "Download failed.",
                                progress.status,
                            ),
                        );
                        setStatus("error");
                    }
                }
            },
        );

        // Check current status (download was already started at wizard open)
        const checkStatus = async () => {
            try {
                const [platformInfo, ltStatus] = await Promise.all([
                    setupApi().checkPlatform(),
                    setupApi().checkLanguageToolStatus(),
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
                setError(
                    getSetupFriendlyError(
                        err,
                        "Setup could not complete. You can continue and retry later.",
                    ),
                );
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
                                    stroke="#2ef6ad"
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
                                                        : "#2ef6ad",
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
                        <div style={styles.successIcon}>
                            <AutoAwesomeIcon style={{ color: "#2ef6ad" }} />
                        </div>
                        <h2 style={styles.stepTitle}>All set!</h2>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div style={styles.errorIcon}>
                            <WarningAmberIcon style={{ color: "#e74c3c" }} />
                        </div>
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

const CompleteStep: React.FC<{
    onComplete: () => void;
    onBack: () => void;
}> = ({ onComplete, onBack }) => (
    <div style={styles.stepContainer}>
        <div style={styles.successIcon}>
            <img
                src={strokeLargeLogo}
                alt="Success"
                style={{ width: "64px", height: "64px", objectFit: "contain" }}
            />
        </div>
        <h2 style={styles.stepTitle}>You're All Set!</h2>
        <p style={styles.stepDescription}>
            Inkline is ready to help you tell your stories.
        </p>

        <div style={styles.buttonRow}>
            <button style={styles.secondaryButton} onClick={onBack}>
                Back
            </button>
            <button style={styles.primaryButton} onClick={onComplete}>
                Launch Inkline
            </button>
        </div>
    </div>
);

// Main Setup Wizard Component
const SetupWizard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
    const [isWindows, setIsWindows] = useState(true);
    const [legalPolicies, setLegalPolicies] =
        useState<LegalPoliciesResponse | null>(null);
    const [legalPoliciesLoading, setLegalPoliciesLoading] = useState(true);
    const [legalPoliciesError, setLegalPoliciesError] = useState<string | null>(
        null,
    );
    const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
    const [hasAcceptedLegal, setHasAcceptedLegal] = useState(false);
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
        legalAccepted: false,
        legalAcceptedAt: null,
        legalVersion: "2026-03-22",
    });

    // Check platform and start LanguageTool download in background on mount
    useEffect(() => {
        let isSubscribed = true;

        const initializeWizard = async () => {
            try {
                const [platformInfo, ltStatus] = await Promise.all([
                    setupApi().checkPlatform(),
                    setupApi().checkLanguageToolStatus(),
                ]);

                if (!isSubscribed) return;
                setIsWindows(platformInfo.isWindows);

                // Start LanguageTool download in background if needed.
                if (!ltStatus.installed) {
                    // Fire and forget - don't await, let it download in background
                    setupApi()
                        .startDownloads({
                            comfyui: false,
                            image: false,
                            audio: false,
                            languagetool: true,
                        })
                        .catch((err: unknown) => {
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

    useEffect(() => {
        let isSubscribed = true;

        const loadPolicies = async () => {
            setLegalPoliciesLoading(true);
            setLegalPoliciesError(null);
            try {
                const policies = await setupApi().getLegalPolicies();
                if (!isSubscribed) return;
                setLegalPolicies(policies);
                setConfig((prev) => ({
                    ...prev,
                    legalVersion: policies.legalVersion,
                }));
            } catch (error) {
                if (!isSubscribed) return;
                setLegalPoliciesError(
                    getSetupFriendlyError(
                        error,
                        "Could not load legal policies. Please restart setup.",
                    ),
                );
            } finally {
                if (isSubscribed) {
                    setLegalPoliciesLoading(false);
                }
            }
        };

        void loadPolicies();

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
            await setupApi().completeSetup(config);
        } catch (error) {
            console.error("Failed to complete setup:", error);
        }
    };

    const handleLegalAcceptanceChange = useCallback(
        (accepted: boolean) => {
            setHasAcceptedLegal(accepted);
            updateConfig({
                legalAccepted: accepted,
                legalAcceptedAt: accepted ? new Date().toISOString() : null,
            });
        },
        [updateConfig],
    );

    const steps: SetupStep[] = [
        "welcome",
        "features",
        "legal",
        "downloads",
        "finalizing",
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
            {/* Close button */}
            <button
                onClick={() => setupApi().closeWindow()}
                style={styles.closeButton}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e81123";
                    e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#888";
                }}
                title="Close"
            >
                ✕
            </button>

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
                {currentStep === "legal" && (
                    <LegalStep
                        policies={legalPolicies}
                        isLoading={legalPoliciesLoading}
                        error={legalPoliciesError}
                        hasScrolledToEnd={hasScrolledToEnd}
                        hasAccepted={hasAcceptedLegal}
                        onScrolledToEnd={() => setHasScrolledToEnd(true)}
                        onAcceptedChange={handleLegalAcceptanceChange}
                        onNext={goNext}
                        onBack={goBack}
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
                {currentStep === "complete" && (
                    <CompleteStep onComplete={handleComplete} onBack={goBack} />
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
        position: "relative",
        WebkitAppRegion: "drag",
    } as React.CSSProperties,
    closeButton: {
        position: "absolute",
        top: "8px",
        right: "8px",
        width: "32px",
        height: "32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        color: "#888",
        fontSize: "16px",
        cursor: "pointer",
        borderRadius: "4px",
        padding: 0,
        WebkitAppRegion: "no-drag",
        zIndex: 100,
        transition: "background-color 0.15s, color 0.15s",
    } as React.CSSProperties,
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
        backgroundColor: "#2ef6ad",
    },
    progressLine: {
        width: "40px",
        height: "2px",
        backgroundColor: "#3a3b3e",
        margin: "0 4px",
        transition: "background-color 0.3s ease",
    },
    progressLineActive: {
        backgroundColor: "#2ef6ad",
    },
    content: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "auto",
        WebkitAppRegion: "no-drag",
    } as React.CSSProperties,
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
        backgroundColor: "#2ef6ad",
        color: "#000000",
        border: "none",
        padding: "12px 32px",
        borderRadius: "8px",
        fontSize: "16px",
        fontWeight: 500,
        cursor: "pointer",
        transition: "background-color 0.2s ease",
    },
    primaryButtonDisabled: {
        backgroundColor: "#3a3b3e",
        color: "#8a8b8e",
        cursor: "not-allowed",
        opacity: 1,
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
        borderColor: "#2ef6ad",
        backgroundColor: "rgba(46, 246, 173, 0.1)",
    },
    featureCardInactive: {
        borderColor: "transparent",
        backgroundColor: "#2a2b2e",
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
        borderRadius: "4px",
        border: "2px solid #3a3b3e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: "14px",
        flexShrink: 0,
    },
    checkboxActive: {
        backgroundColor: "#2ef6ad",
        borderColor: "#2ef6ad",
    },
    checkboxInactive: {
        backgroundColor: "transparent",
        borderColor: "#3a3b3e",
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
        marginTop: "0px",
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
        marginBottom: "0px",
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
        color: "#2ef6ad",
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
    legalMeta: {
        fontSize: "12px",
        color: "#8a8b8e",
        marginBottom: "8px",
        textAlign: "left",
    },
    legalScrollBox: {
        maxHeight: "300px",
        overflowY: "auto",
        border: "1px solid #3a3b3e",
        borderRadius: "10px",
        backgroundColor: "#1a1b1e",
        padding: "16px",
        textAlign: "left",
    },
    legalMarkdown: {
        color: "#8a8b8e",
        fontSize: "13px",
        lineHeight: 1.5,
        whiteSpace: "normal",
    },
    legalHeadingPrimary: {
        fontSize: "16px",
        fontWeight: 600,
        color: "#f6f7fb",
        margin: "0 0 8px 0",
    },
    legalHeadingSecondary: {
        fontSize: "14px",
        fontWeight: 600,
        color: "#f6f7fb",
        margin: "12px 0 6px 0",
    },
    legalParagraph: {
        margin: "0 0 8px 0",
        color: "#8a8b8e",
        lineHeight: 1.5,
    },
    legalListItem: {
        marginBottom: "6px",
        color: "#8a8b8e",
    },
    legalDivider: {
        border: "none",
        borderTop: "1px solid #3a3b3e",
        margin: "14px 0",
    },
    legalCheckboxRow: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginTop: "14px",
        fontSize: "13px",
        color: "#d8dae0",
        textAlign: "left",
    },
    legalCheckboxInput: {
        width: "16px",
        height: "16px",
        accentColor: "#2ef6ad",
        cursor: "pointer",
    },
};

// Exports for dev preview
export {
    WelcomeStep,
    FeaturesStep,
    LegalStep,
    DownloadsStep,
    FinalizingStep,
    CompleteStep,
    SetupWizard,
    styles,
};

// Mount the app
const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<SetupWizard />);
}
