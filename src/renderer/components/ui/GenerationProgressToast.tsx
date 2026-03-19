import React, { useEffect, useRef, useState } from "react";

export type AppToastVariant = "progress" | "success" | "error" | "info";

export interface AppToast {
    id: string;
    variant: AppToastVariant;
    title: string;
    description?: string;
    color?: string;
    progress?: number;
    durationMs?: number;
    actionLabel?: string;
    actionDisabled?: boolean;
    onAction?: () => void;
}

type AppToastInput = Omit<AppToast, "id"> & { id?: string };

type ToastBusEvent =
    | { type: "upsert"; toast: AppToast }
    | { type: "dismiss"; id: string };

const listeners: Set<(event: ToastBusEvent) => void> = new Set();
let nextToastId = 0;

const emitToastEvent = (event: ToastBusEvent): void => {
    for (const listener of listeners) {
        listener(event);
    }
};

const createToastId = (): string => {
    nextToastId += 1;
    return `toast-${nextToastId}`;
};

export const showToast = (input: AppToastInput): string => {
    const id = input.id ?? createToastId();

    emitToastEvent({
        type: "upsert",
        toast: {
            id,
            variant: input.variant,
            title: input.title,
            description: input.description,
            color: input.color,
            progress: input.progress,
            durationMs: input.durationMs,
            actionLabel: input.actionLabel,
            actionDisabled: input.actionDisabled,
            onAction: input.onAction,
        },
    });

    return id;
};

export const updateToast = (id: string, patch: Partial<AppToast>): void => {
    emitToastEvent({
        type: "upsert",
        toast: {
            id,
            variant: patch.variant ?? "info",
            title: patch.title ?? "",
            description: patch.description,
            color: patch.color,
            progress: patch.progress,
            durationMs: patch.durationMs,
            actionLabel: patch.actionLabel,
            actionDisabled: patch.actionDisabled,
            onAction: patch.onAction,
        },
    });
};

export const dismissToast = (id: string): void => {
    emitToastEvent({ type: "dismiss", id });
};

export const GenerationProgressToast: React.FC = () => {
    const [toasts, setToasts] = useState<AppToast[]>([]);
    const timeoutsRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        const addListener = (listener: (event: ToastBusEvent) => void) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        };

        const unsubscribeToasts = addListener((event) => {
            if (event.type === "dismiss") {
                const timeoutId = timeoutsRef.current.get(event.id);
                if (timeoutId) {
                    window.clearTimeout(timeoutId);
                    timeoutsRef.current.delete(event.id);
                }
                setToasts((prev) =>
                    prev.filter((toast) => toast.id !== event.id),
                );
                return;
            }

            setToasts((prev) => {
                const existing = prev.find(
                    (item) => item.id === event.toast.id,
                );
                if (!existing) {
                    return [...prev, event.toast];
                }

                return prev.map((item) =>
                    item.id === event.toast.id
                        ? {
                              ...item,
                              ...event.toast,
                              variant: event.toast.variant || item.variant,
                              title: event.toast.title || item.title,
                          }
                        : item,
                );
            });

            if (
                typeof event.toast.durationMs === "number" &&
                event.toast.durationMs > 0
            ) {
                const existingTimeout = timeoutsRef.current.get(event.toast.id);
                if (existingTimeout) {
                    window.clearTimeout(existingTimeout);
                }

                const timeoutId = window.setTimeout(() => {
                    dismissToast(event.toast.id);
                }, event.toast.durationMs);

                timeoutsRef.current.set(event.toast.id, timeoutId);
            }
        });

        const unsubscribeGeneration = window.generationEvents.onProgress(
            (payload) => {
                const toastId = `generation-${payload.type}`;
                const cappedProgress = Math.max(
                    0,
                    Math.min(100, payload.progress),
                );
                const label = payload.type === "audio" ? "audio" : "image";

                showToast({
                    id: toastId,
                    variant: "progress",
                    title: `Generating ${label}`,
                    description: `${Math.round(cappedProgress)}% complete`,
                    color: "var(--accent)",
                    progress: cappedProgress,
                });

                if (cappedProgress >= 100) {
                    showToast({
                        id: toastId,
                        variant: "success",
                        title: `Generated ${label}`,
                        description: "Your asset is ready.",
                        durationMs: 2500,
                    });
                }
            },
        );

        return () => {
            unsubscribeToasts();
            unsubscribeGeneration();

            for (const timeoutId of timeoutsRef.current.values()) {
                window.clearTimeout(timeoutId);
            }
            timeoutsRef.current.clear();
        };
    }, []);

    if (!toasts.length) {
        return null;
    }

    return (
        <div className="app-toast-container">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`app-toast app-toast--${toast.variant}`}
                    style={
                        toast.color
                            ? {
                                  borderColor: toast.color,
                              }
                            : undefined
                    }
                >
                    <div className="app-toast-title">{toast.title}</div>
                    {toast.description ? (
                        <div className="app-toast-description">
                            {toast.description}
                        </div>
                    ) : null}
                    {toast.actionLabel ? (
                        <button
                            type="button"
                            className="app-toast-action"
                            onClick={toast.onAction}
                            disabled={toast.actionDisabled}
                        >
                            {toast.actionLabel}
                        </button>
                    ) : null}
                    {toast.variant === "progress" ? (
                        <div className="app-toast-progress-bar">
                            <div
                                className="app-toast-progress-fill"
                                style={{
                                    width: `${Math.max(0, Math.min(100, toast.progress ?? 0))}%`,
                                    background: toast.color ?? "var(--accent)",
                                }}
                            />
                        </div>
                    ) : null}
                </div>
            ))}
        </div>
    );
};
