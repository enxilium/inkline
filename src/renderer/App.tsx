import React from "react";

import { Button } from "./components/ui/Button";
import { useAppStore } from "./state/appStore";
import type { ProjectSummary } from "./types";
import { AuthView } from "./views/AuthView";
import { LoadingView } from "./views/LoadingView";
import { ProjectSelectionView } from "./views/ProjectSelectionView";
import { WorkspaceView } from "./views/WorkspaceView";

import "@fontsource-variable/inter/index.css";
import "@fontsource/roboto/index.css";
import "@fontsource/open-sans/index.css";
import "@fontsource/lato/index.css";
import "@fontsource/montserrat/index.css";
import "@fontsource/source-sans-3/index.css";
import "@fontsource/work-sans/index.css";
import "@fontsource/nunito/index.css";
import "@fontsource/space-grotesk/index.css";
import "@fontsource/merriweather/index.css";
import "@fontsource/source-serif-4/index.css";
import "@fontsource/lora/index.css";
import "@fontsource/playfair-display/index.css";
import "@fontsource/crimson-pro/index.css";
import "@fontsource/roboto-slab/index.css";
import "@fontsource/ibm-plex-mono/index.css";

import "flexlayout-react/style/dark.css";
import "./styles.css";

export const App: React.FC = () => {
    const {
        stage,
        authMode,
        authForm,
        authError,
        isAuthSubmitting,
        user,
        projects,
        projectsStatus,
        projectsError,
        projectSelectionError,
        openingProjectId,
        activeProjectName,
        bootstrapSession,
        setAuthField,
        toggleAuthMode,
        submitAuth,
        loadProjects,
        setProjectsError,
        createProject,
        deleteProject,
        openProject,
        logout,
        returnToProjects,
    } = useAppStore();

    React.useEffect(() => {
        bootstrapSession();
    }, [bootstrapSession]);

    const handleAuthSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            submitAuth().catch(() => {
                /* noop */
            });
        },
        [submitAuth]
    );

    const handleAuthFieldChange = React.useCallback(
        (field: keyof typeof authForm) =>
            (event: React.ChangeEvent<HTMLInputElement>) => {
                setAuthField(field, event.target.value);
            },
        [setAuthField]
    );

    const handleToggleAuthMode = React.useCallback(() => {
        toggleAuthMode();
    }, [toggleAuthMode]);

    const handleCreateProject = React.useCallback(
        async (title: string) => {
            if (!user) {
                return;
            }

            const trimmed = title.trim();
            if (!trimmed) {
                setProjectsError("Project title cannot be empty.");
                return;
            }

            await createProject({ title: trimmed });
        },
        [createProject, setProjectsError, user]
    );

    const handleRefreshProjects = React.useCallback(() => {
        if (!user) {
            return;
        }
        loadProjects(user.id).catch(() => {
            /* noop */
        });
    }, [loadProjects, user]);

    const handleOpenProject = React.useCallback(
        (project: ProjectSummary) => {
            openProject(project).catch(() => {
                /* noop */
            });
        },
        [openProject]
    );

    const handleDeleteProject = React.useCallback(
        (projectId: string) => {
            deleteProject(projectId).catch(() => {
                /* noop */
            });
        },
        [deleteProject]
    );

    const handleLogout = React.useCallback(() => {
        logout().catch(() => {
            /* noop */
        });
    }, [logout]);

    const renderStage = (): React.ReactNode => {
        switch (stage) {
            case "workspace":
                return <WorkspaceView />;
            case "projectSelect":
                return (
                    <ProjectSelectionView
                        projects={projects}
                        status={projectsStatus}
                        error={projectsError}
                        selectionError={projectSelectionError}
                        openingProjectId={openingProjectId}
                        onRefresh={handleRefreshProjects}
                        onCreateProject={handleCreateProject}
                        onOpenProject={handleOpenProject}
                        onDeleteProject={handleDeleteProject}
                    />
                );
            case "auth":
                return (
                    <AuthView
                        mode={authMode}
                        form={authForm}
                        error={authError}
                        isSubmitting={isAuthSubmitting}
                        onSubmit={handleAuthSubmit}
                        onFieldChange={handleAuthFieldChange}
                        onToggleMode={handleToggleAuthMode}
                    />
                );
            case "checkingSession":
            default:
                return <LoadingView />;
        }
    };

    return (
        <div>
            {stage === "workspace" && activeProjectName ? (
                null
            ) : (
                <div className="top-nav">
                    <div className="nav-left">
                        <div className="brand-mark">Inkline Studio</div>
                    </div>
                    <div className="nav-actions">
                        {user ? (
                            <div className="user-chip">{user.email}</div>
                        ) : null}
                        {user ? (
                            <Button type="button" onClick={handleLogout}>
                                Log out
                            </Button>
                        ) : null}
                    </div>
                </div>
            )}
            
            
            <div className="app-shell">


                {renderStage()}


            </div>
        </div>
    );
};
