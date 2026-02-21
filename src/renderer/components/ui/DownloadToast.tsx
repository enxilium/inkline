import React, { useEffect, useState, useCallback } from "react";

interface DownloadToastItem {
    id: number;
    message: string;
    variant: "success" | "error";
}

let nextId = 0;
const listeners: Set<(item: DownloadToastItem) => void> = new Set();

/**
 * Push a toast notification from anywhere in the renderer.
 * The `DownloadToast` component must be mounted to display it.
 */
export const showDownloadToast = (
    message: string,
    variant: "success" | "error" = "success",
) => {
    const item: DownloadToastItem = { id: nextId++, message, variant };
    for (const listener of listeners) {
        listener(item);
    }
};

export const DownloadToast: React.FC = () => {
    const [toasts, setToasts] = useState<DownloadToastItem[]>([]);

    const addToast = useCallback((item: DownloadToastItem) => {
        setToasts((prev) => [...prev, item]);
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== item.id));
        }, 4000);
    }, []);

    useEffect(() => {
        listeners.add(addToast);
        return () => {
            listeners.delete(addToast);
        };
    }, [addToast]);

    if (toasts.length === 0) return null;

    return (
        <div className="download-toast-container">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`download-toast download-toast--${toast.variant}`}
                >
                    <span className="download-toast-icon">
                        {toast.variant === "success" ? "✓" : "✕"}
                    </span>
                    <span className="download-toast-message">
                        {toast.message}
                    </span>
                </div>
            ))}
        </div>
    );
};
