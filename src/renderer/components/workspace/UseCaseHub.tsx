import React from "react";
import { Button } from "../ui/Button";
import type { UseCaseShortcut, ShortcutStates } from "../../types";

interface UseCaseHubProps {
    shortcuts: UseCaseShortcut[];
    shortcutStates: ShortcutStates;
    onRunShortcut: (shortcut: UseCaseShortcut) => void;
}

export const UseCaseHub: React.FC<UseCaseHubProps> = ({
    shortcuts,
    shortcutStates,
    onRunShortcut,
}) => {
    return (
        <aside className="usecase-panel">
            <div>
                <p className="panel-label">Use case hub</p>
                <h2>Launch a workflow</h2>
                <p className="panel-subtitle">
                    Quick shortcuts into the most common Inkline use cases.
                </p>
            </div>
            <div className="usecase-grid">
                {shortcuts.map((shortcut) => {
                    const state =
                        shortcutStates[shortcut.id]?.status ?? "idle";
                    const errorMessage =
                        shortcutStates[shortcut.id]?.message;
                    return (
                        <div key={shortcut.id} className="usecase-card">
                            <div className="usecase-meta">
                                <span className="usecase-category">
                                    {shortcut.category}
                                </span>
                                <h3>{shortcut.title}</h3>
                                <p>{shortcut.description}</p>
                            </div>
                            <Button
                                type="button"
                                className={
                                    state === "running"
                                        ? "is-loading"
                                        : undefined
                                }
                                onClick={() => onRunShortcut(shortcut)}
                                disabled={state === "running"}
                            >
                                {state === "running"
                                    ? "Running…"
                                    : state === "success"
                                      ? "Done"
                                      : "Run"}
                            </Button>
                            {state === "error" && errorMessage ? (
                                <span className="card-hint is-error">
                                    {errorMessage}
                                </span>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </aside>
    );
};
