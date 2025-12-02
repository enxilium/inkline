import React from "react";

import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { ScrollArea } from "../components/ui/ScrollArea";
import type { ProjectSummary, ProjectsStatus } from "../types";

type ProjectSelectionViewProps = {
    projects: ProjectSummary[];
    status: ProjectsStatus;
    error: string | null;
    selectionError: string | null;
    openingProjectId: string | null;
    onRefresh: () => void;
    onCreateProject: (title: string) => Promise<void> | void;
    onOpenProject: (project: ProjectSummary) => void;
    onDeleteProject: (projectId: string) => void;
};

const formatTimestamp = (value: Date | string | number): string => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "Unknown";
    }

    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

export const ProjectSelectionView: React.FC<ProjectSelectionViewProps> = ({
    projects,
    status,
    error,
    selectionError,
    openingProjectId,
    onRefresh,
    onCreateProject,
    onOpenProject,
    onDeleteProject,
}) => {
    const [draftTitle, setDraftTitle] = React.useState("");
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = draftTitle.trim();
        if (!trimmed) {
            setLocalError("Project title cannot be empty.");
            return;
        }

        setLocalError(null);
        setIsSubmitting(true);
        try {
            await onCreateProject(trimmed);
            setDraftTitle("");
        } catch (submitError) {
            setLocalError(
                (submitError as Error)?.message ?? "Unable to create project."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div>
                <p className="panel-label">Projects</p>
                <h2>Welcome to Inkline</h2>
                <p className="panel-subtitle">
                    What are we working on today?
                </p>
            </div>
            <div className="projects">
                <div className="project-actions">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onRefresh}
                        disabled={status === "loading"}
                    >
                        {status === "loading" ? "Refreshing…" : "Refresh"}
                    </Button>
                    <form className="create-project-form" onSubmit={handleSubmit}>
                        <Label htmlFor="new-project-title" className="sr-only">
                            New Project Title
                        </Label>
                        <Input
                            id="new-project-title"
                            type="text"
                            value={draftTitle}
                            onChange={(event) => setDraftTitle(event.target.value)}
                            placeholder="New Project Title"
                            disabled={isSubmitting}
                        />
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Creating…" : "Create"}
                        </Button>
                    </form>
                </div>
                {error ? <span className="card-hint is-error">{error}</span> : null}
                {localError ? (
                    <span className="card-hint is-error">{localError}</span>
                ) : null}
                <div className="project-grid">
                    {status === "loading" ? (
                        <div className="project-card is-placeholder">
                            <p className="panel-subtitle">
                                Loading your projects…
                            </p>
                        </div>
                    ) : projects.length ? (
                        projects.map((project) => (
                            <div key={project.id} className="project-card" onClick={() => onOpenProject(project)}>
                                {/*project.cover ? <img src={project.cover} alt={`${project.title} cover`} /> : null*/}
                                <div className="project-card-cover"></div>
                                <div>
                                    <h3>{project.title}</h3>
                                    <p className="panel-subtitle">
                                        Updated{" "}
                                        {formatTimestamp(project.updatedAt)}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => {
                                        if (
                                            window.confirm(
                                                `Are you sure you want to delete "${project.title}"? This cannot be undone.`
                                            )
                                        ) {
                                            onDeleteProject(project.id);
                                        }
                                    }}
                                    disabled={openingProjectId === project.id}
                                >
                                    Delete
                                </Button>
                            </div>
                        ))
                    ) : (
                        <p className="empty-hint">
                            No projects yet. Create one to begin writing.
                        </p>
                    )}
                </div>
            </div>
            {selectionError ? (
                <span className="card-hint is-error">{selectionError}</span>
            ) : null}
        </div>
    );
};
