import React from "react";
import lottie from "lottie-web";
import Typed from "typed.js";

import lineOnceAnimation from "../../../assets/line-once.json";
import lineLoopAnimation from "../../../assets/line-loop.json";

import { Button } from "../components/ui/Button";
import { MoreVerticalIcon, RefreshCwIcon } from "../components/ui/Icons";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import type {
    ProjectSummary,
    ProjectsStatus,
    WorkspaceImageAsset,
} from "../types";

type ProjectSelectionViewProps = {
    projects: ProjectSummary[];
    projectCovers: Record<string, WorkspaceImageAsset>;
    status: ProjectsStatus;
    error: string | null;
    selectionError: string | null;
    openingProjectId: string | null;
    onRefresh: () => void;
    onCreateProject: (title: string) => Promise<void> | void;
    onOpenProject: (project: ProjectSummary) => void;
    onDeleteProject: (projectId: string) => void;
    onRenameProject: (projectId: string, title: string) => void;
    onUploadCover: (projectId: string, file: File) => Promise<void> | void;
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
    onRefresh,
    onCreateProject,
    onOpenProject,
    onDeleteProject,
    onRenameProject,
    onUploadCover,
    projectCovers,
}) => {
    const INTRO_DRAW_MS = 1500;
    const INTRO_FLY_MS = 900;

    const [draftTitle, setDraftTitle] = React.useState("");
    const [localError, setLocalError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [openMenuProjectId, setOpenMenuProjectId] = React.useState<
        string | null
    >(null);
    const [introStep, setIntroStep] = React.useState<
        "drawing" | "flyOut" | "done"
    >("drawing");
    const [isContentVisible, setIsContentVisible] = React.useState(false);
    const [renamingProjectId, setRenamingProjectId] = React.useState<
        string | null
    >(null);
    const [renameValue, setRenameValue] = React.useState("");
    const renameInputRef = React.useRef<HTMLInputElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const targetProjectIdRef = React.useRef<string | null>(null);
    const welcomeTextRef = React.useRef<HTMLSpanElement>(null);
    const underlineRef = React.useRef<HTMLDivElement>(null);
    const introLottieRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!isContentVisible || !welcomeTextRef.current) {
            return;
        }

        // Ensure we always restart from an empty node.
        welcomeTextRef.current.textContent = "";

        const typed = new Typed(welcomeTextRef.current, {
            strings: ["Welcome to Inkline."],
            typeSpeed: 42,
            startDelay: 160,
            showCursor: false,
            contentType: "null",
        });

        let lottieInstance: ReturnType<typeof lottie.loadAnimation> | null =
            null;

        if (underlineRef.current) {
            // Start the Lottie underline after the typing finishes
            const typingDuration = 160 + "Welcome to Inkline.".length * 42;
            const lottieTimer = window.setTimeout(() => {
                if (!underlineRef.current) return;
                lottieInstance = lottie.loadAnimation({
                    container: underlineRef.current,
                    renderer: "svg",
                    loop: false,
                    autoplay: true,
                    animationData: lineOnceAnimation,
                });
            }, typingDuration);

            return () => {
                typed.destroy();
                window.clearTimeout(lottieTimer);
                lottieInstance?.destroy();
            };
        }

        return () => {
            typed.destroy();
        };
    }, [isContentVisible]);

    React.useEffect(() => {
        let introLottieInstance: ReturnType<typeof lottie.loadAnimation> | null = null;

        if (introLottieRef.current) {
            introLottieInstance = lottie.loadAnimation({
                container: introLottieRef.current,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                animationData: lineLoopAnimation,
            });
        }

        // Smooth sequence:
        // 1) Draw logo centered
        // 2) Fly up + fade out
        // 3) Reveal welcome + gallery (fade) while typing begins
        const flyTimer = window.setTimeout(() => {
            setIntroStep("flyOut");
            setIsContentVisible(true);
        }, INTRO_DRAW_MS);

        const doneTimer = window.setTimeout(() => {
            setIntroStep("done");
        }, INTRO_DRAW_MS + INTRO_FLY_MS);

        return () => {
            window.clearTimeout(flyTimer);
            window.clearTimeout(doneTimer);
            introLottieInstance?.destroy();
        };
    }, []);

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

    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        const projectId = targetProjectIdRef.current;

        if (!file || !projectId) return;

        // Reset input so the same file can be selected again if needed
        event.target.value = "";

        try {
            await onUploadCover(projectId, file);

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
        <div className="projects-home">
            {introStep !== "done" ? (
                <div
                    className={
                        "projectselect-intro" +
                        (introStep === "flyOut" ? " is-flyout" : "")
                    }
                    aria-hidden="true"
                >
                    <div
                        ref={introLottieRef}
                        className="projectselect-intro-logo"
                        style={{ width: 220, height: 52 }}
                    />
                </div>
            ) : null}

            <div
                className={
                    "projectselect-content" +
                    (isContentVisible ? " is-visible" : "")
                }
            >
                <div className="projects-home-header">
                    <h2
                        className="welcome-handwritten"
                        aria-label="Welcome to Inkline"
                    >
                        <span ref={welcomeTextRef} />
                        <div
                            ref={underlineRef}
                            className="welcome-underline-lottie"
                        />
                    </h2>
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
                        <form
                            className="create-project-form"
                            onSubmit={handleSubmit}
                        >
                            <Label
                                htmlFor="new-project-title"
                                className="sr-only"
                            >
                                New Project Title
                            </Label>
                            <Input
                                id="new-project-title"
                                type="text"
                                value={draftTitle}
                                onChange={(event) =>
                                    setDraftTitle(event.target.value)
                                }
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
                    {error ? (
                        <span className="card-hint is-error">{error}</span>
                    ) : null}
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
                                                    setRenameValue(project.title);
                                                    setRenamingProjectId(project.id);
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
                                                        onDeleteProject(
                                                            project.id
                                                        );
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
                                            (project.coverImageId &&
                                            projectCovers[project.coverImageId]
                                                ? " has-image"
                                                : "")
                                        }
                                        style={
                                            project.coverImageId &&
                                            projectCovers[project.coverImageId]
                                                ? {
                                                      backgroundImage: `url("${
                                                          projectCovers[
                                                              project
                                                                  .coverImageId
                                                          ].url
                                                      }")`,
                                                  }
                                                : undefined
                                        }
                                    >
                                        {!project.coverImageId ||
                                        !projectCovers[project.coverImageId] ? (
                                            <span className="project-card-cover-placeholder"></span>
                                        ) : null}
                                    </div>
                                    <div>
                                        {renamingProjectId === project.id ? (
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    const trimmed = renameValue.trim();
                                                    if (trimmed && trimmed !== project.title) {
                                                        onRenameProject(project.id, trimmed);
                                                    }
                                                    setRenamingProjectId(null);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <input
                                                    ref={renameInputRef}
                                                    className="project-rename-input"
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    onBlur={() => {
                                                        const trimmed = renameValue.trim();
                                                        if (trimmed && trimmed !== project.title) {
                                                            onRenameProject(project.id, trimmed);
                                                        }
                                                        setRenamingProjectId(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            setRenamingProjectId(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            </form>
                                        ) : (
                                            <h3>{project.title}</h3>
                                        )}
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
