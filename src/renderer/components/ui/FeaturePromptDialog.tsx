import React, { useEffect, useRef } from "react";
import { showDownloadToast } from "./DownloadToast";
import { dismissToast, showToast } from "./GenerationProgressToast";

const STARTUP_INTEGRITY_INFO_TOAST_ID = "startup-integrity-status";

const getDownloadLabel = (downloadType: string): string => {
    if (downloadType === "comfyui") {
        return "ComfyUI";
    }
    if (downloadType === "image") {
        return "Image model";
    }
    if (downloadType === "audio") {
        return "Audio model";
    }
    if (downloadType === "languagetool") {
        return "LanguageTool";
    }
    return "component";
};

const useStartupIntegrityToasts = () => {
    const completedToasts = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (
            !window.featureApi?.getConfig ||
            !window.featureEvents?.onDownloadProgress
        ) {
            return;
        }

        window.featureApi
            .getConfig()
            .then((config) => {
                if (config.startupIntegrity.state === "running") {
                    showToast({
                        id: STARTUP_INTEGRITY_INFO_TOAST_ID,
                        variant: "info",
                        title: "Checking local services",
                        description:
                            "Startup integrity checks are running in the background.",
                        durationMs: 3500,
                    });
                }
            })
            .catch((): void => {
                /* noop */
            });

        const unsubscribe = window.featureEvents.onDownloadProgress(
            (progress) => {
                if (progress.source !== "startup-integrity") {
                    return;
                }

                const label = getDownloadLabel(progress.downloadType);
                const toastId = `startup-integrity-${progress.downloadType}`;
                const clampedProgress = Math.max(
                    0,
                    Math.min(100, progress.percentage),
                );

                if (
                    progress.status === "downloading" ||
                    progress.status === "extracting" ||
                    progress.status === "pending"
                ) {
                    dismissToast(STARTUP_INTEGRITY_INFO_TOAST_ID);
                    showToast({
                        id: toastId,
                        variant: "progress",
                        title: `Repairing ${label}`,
                        description: `${clampedProgress}% complete`,
                        progress: clampedProgress,
                        color: "var(--accent)",
                    });
                    return;
                }

                if (progress.status === "completed") {
                    dismissToast(toastId);
                    const completionKey = `${progress.downloadType}:completed`;
                    if (!completedToasts.current.has(completionKey)) {
                        completedToasts.current.add(completionKey);
                        showDownloadToast(
                            `${label} is ready after startup repair.`,
                        );
                    }
                    return;
                }

                if (progress.status === "error") {
                    dismissToast(toastId);
                    showDownloadToast(
                        `${label} repair failed during startup checks.`,
                        "error",
                    );
                }
            },
        );

        return () => {
            unsubscribe();
        };
    }, []);
};

export const FeaturePromptDialog: React.FC = () => {
    useStartupIntegrityToasts();
    return null;
};
