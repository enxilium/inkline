import React, { useEffect, useState, useCallback } from "react";
import { showDownloadToast } from "./DownloadToast";

interface MissingFeature {
    kind: "imageGeneration" | "audioGeneration";
    label: string;
}

/**
 * Listens for feature download completion and shows a toast.
 * Lives for the entire renderer lifetime (mounted in App.tsx alongside this
 * component) so toasts fire even after the prompt dialog has dismissed.
 */
const useFeatureDownloadToasts = (active: boolean) => {
    useEffect(() => {
        if (!active || !window.featureEvents?.onDownloadProgress) return;

        const unsubscribe = window.featureEvents.onDownloadProgress(
            (progress) => {
                if (
                    progress.downloadType !== "image" &&
                    progress.downloadType !== "audio"
                ) {
                    return;
                }

                if (progress.status === "completed") {
                    if (progress.downloadType === "image") {
                        showDownloadToast("Image generation is ready!");
                    } else if (progress.downloadType === "audio") {
                        showDownloadToast("Audio generation is ready!");
                    }
                }
            },
        );

        return () => {
            unsubscribe();
        };
    }, [active]);
};

/**
 * On every app launch, checks whether the user has AI features enabled in
 * their config but the required models / ComfyUI are not actually present on
 * disk.  If anything is missing it shows a one-time modal asking whether to
 * download now.  Dismissing lasts for the current session only – the prompt
 * will reappear on the next launch.
 *
 * Downloads triggered here send progress through the same
 * `FEATURE_DOWNLOAD_PROGRESS` channel so the Settings page stays in sync.
 */
export const FeaturePromptDialog: React.FC = () => {
    const [missing, setMissing] = useState<MissingFeature[]>([]);
    const [dismissed, setDismissed] = useState(false);
    // Track whether we kicked off downloads so the toast hook stays active
    const [downloadsStarted, setDownloadsStarted] = useState(false);

    // Fire completion / error toasts for the whole renderer session once
    // downloads have been triggered from this prompt.
    useFeatureDownloadToasts(downloadsStarted);

    // Run once on mount – check feature config vs actual downloads
    useEffect(() => {
        if (!window.featureApi?.getConfig) return;

        window.featureApi
            .getConfig()
            .then((config) => {
                if (!config.isWindows) return;

                const gaps: MissingFeature[] = [];

                if (
                    config.features.imageGeneration &&
                    (!config.comfyuiInstalled || !config.modelsDownloaded.image)
                ) {
                    gaps.push({
                        kind: "imageGeneration",
                        label: "Image Generation",
                    });
                }

                if (
                    config.features.audioGeneration &&
                    (!config.comfyuiInstalled || !config.modelsDownloaded.audio)
                ) {
                    gaps.push({
                        kind: "audioGeneration",
                        label: "Audio Generation",
                    });
                }

                setMissing(gaps);
            })
            .catch(() => {
                /* noop */
            });
    }, []);

    const handleInstall = useCallback(() => {
        // Fire-and-forget: kick off downloads, dismiss immediately.
        for (const feat of missing) {
            window.featureApi.enableFeature(feat.kind).catch(() => {
                showDownloadToast(`${feat.label} download failed.`, "error");
            });
        }
        setDownloadsStarted(true);
        setDismissed(true);
    }, [missing]);

    const handleDismiss = useCallback(() => {
        setDismissed(true);
    }, []);

    // Nothing to show
    if (missing.length === 0 || dismissed) return null;

    return (
        <div className="feature-prompt-overlay">
            <div className="feature-prompt-dialog">
                <h3 className="feature-prompt-title">Missing AI Components</h3>
                <p className="feature-prompt-body">
                    You have {missing.map((m) => m.label).join(" and ")}{" "}
                    enabled, but the required packages aren't downloaded yet.
                    Would you like to install them now?
                </p>
                <p className="feature-prompt-note">
                    Downloads will happen in the background — you can continue
                    using Inkline while they complete.
                </p>
                <div className="feature-prompt-actions">
                    <button
                        className="feature-prompt-btn feature-prompt-btn--secondary"
                        onClick={handleDismiss}
                    >
                        Not Now
                    </button>
                    <button
                        className="feature-prompt-btn feature-prompt-btn--primary"
                        onClick={handleInstall}
                    >
                        Install Now
                    </button>
                </div>
            </div>
        </div>
    );
};
