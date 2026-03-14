import React from "react";
import { showToast } from "./GenerationProgressToast";

export const showDownloadToast = (
    message: string,
    variant: "success" | "error" = "success",
) => {
    showToast({
        variant,
        title: variant === "success" ? "Download complete" : "Download failed",
        description: message,
        durationMs: 4000,
    });
};

// Backward-compatible no-op component while callers migrate to the generic toast surface.
export const DownloadToast: React.FC = () => null;
