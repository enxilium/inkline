import React from "react";

import { Button } from "../components/ui/Button";
import { MoreVerticalIcon, RefreshCwIcon } from "../components/ui/Icons";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import { ScrollArea } from "../components/ui/ScrollArea";
import type { ProjectSummary, ProjectsStatus } from "../types";
import { ensureRendererApi } from "../utils/api";

const rendererApi = ensureRendererApi();

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
    const [draftTitle, setDraftTitle,] = React.useState("");
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [openMenuProjectId, setOpenMenuProjectId] = React.useState<string | null>(
        null
    );
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const targetProjectIdRef = React.useRef<string | null>(null);

    React.useEffect(() => {
        const handleClickOutside = () => setOpenMenuProjectId(null);

        if (openMenuProjectId) {
            window.addEventListener("click", handleClickOutside);
        }

        return () => {
            window.removeEventListener("click", handleClickOutside);
        };
    }, [openMenuProjectId]);

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

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        const projectId = targetProjectIdRef.current;
        
        if (!file || !projectId) return;

        // Reset input so the same file can be selected again if needed
        event.target.value = "";
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const extension = file.name.split('.').pop() || "";

            await window.api.asset.importAsset({
                projectId,
                payload: {
                    kind: "image",
                    subjectType: "cover",
                    subjectId: projectId,
                    fileData: arrayBuffer,
                    extension
                }
            });
            
            // Refresh to update the project list (e.g. updated timestamp)
            onRefresh();
        } catch (err) {
            console.error("Failed to upload cover", err);
            setLocalError("Failed to upload cover image.");
        }
    };

    const onAddCover = React.useCallback((projectId: string) => {
        targetProjectIdRef.current = projectId;
        fileInputRef.current?.click();
    }, []);

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
                        title="Refresh Projects"
                    >
                        <RefreshCwIcon />
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
                            <div
                                key={project.id}
                                className="project-card"
                                onClick={() => onOpenProject(project)}
                            >
                                <button
                                    className="project-card-menu-trigger"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuProjectId(
                                            openMenuProjectId === project.id
                                                ? null
                                                : project.id
                                        );
                                    }}
                                    title="Project Options"
                                >
                                    <MoreVerticalIcon />
                                </button>
                                {openMenuProjectId === project.id && (
                                    <div
                                        className="project-card-menu"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            className="project-card-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuProjectId(null);
                                                onAddCover(project.id);
                                            }}
                                        >
                                            Rename Project
                                        </button>
                                        <button
                                            className="project-card-menu-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuProjectId(null);
                                                onAddCover(project.id);
                                            }}
                                        >
                                            Change Cover
                                        </button>
                                        <button
                                            className="project-card-menu-item is-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuProjectId(null);
                                                if (
                                                    window.confirm(
                                                        `Are you sure you want to delete "${project.title}"? This cannot be undone.`
                                                    )
                                                ) {
                                                    onDeleteProject(project.id);
                                                }
                                            }}
                                        >
                                            Delete Project
                                        </button>
                                    </div>
                                )}
                                <div
                                    className={
                                        "project-card-cover" +
                                        (project.coverImageUrl ? " has-image" : "")
                                    }
                                    style={
                                        project.coverImageUrl
                                            ? {
                                                backgroundImage: `url("${project.coverImageUrl}")`,
                                            }
                                            : undefined
                                    }
                                >
                                    {!project.coverImageUrl ? (
                                        <span className="project-card-cover-placeholder">
                                             
                                        </span>
                                    ) : null}
                                </div>
                                <div>
                                    <h3>{project.title}</h3>
                                    <p className="panel-subtitle">
                                        Updated{" "}
                                        {formatTimestamp(project.updatedAt)}
                                    </p>
                                </div>
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
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
            />
        </div>
    );
};
