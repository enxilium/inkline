import React from "react";

import { Button } from "./components/ui/Button";
import { UserDropdown } from "./components/ui/UserDropdown";
import { useAppStore } from "./state/appStore";
import type { ProjectSummary } from "./types";
import { AuthView } from "./views/AuthView";
import { LoadingView } from "./views/LoadingView";
import { ProjectSelectionView } from "./views/ProjectSelectionView";
import { SettingsView } from "./views/SettingsView";
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
        openSettings,
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
                    <div style={{ padding: '10vh' }}>
                        <AuthView
                            mode={authMode}
                            form={authForm}
                            error={authError}
                            isSubmitting={isAuthSubmitting}
                            onSubmit={handleAuthSubmit}
                            onFieldChange={handleAuthFieldChange}
                            onToggleMode={handleToggleAuthMode}
                        />
                    </div>
                );
            case "settings":
                return (
                    <div style={{ padding: '10vh' }}>
                        <SettingsView onBack={returnToProjects} />
                    </div>
                );
            case "checkingSession":
                return (
                    <div style={{ padding: '20px' }}>
                        <SettingsView />
                    </div>
                );
            case "checkingSession":
            default:
                return <LoadingView />;
        }
    };

    return (
        <div className="app-container">
            {stage === "workspace" && activeProjectName ? (
                null
            ) : (
                <div className="top-nav">
                    <div className="nav-left">
                        <div className="brand-mark">Inkline Studio</div>
                    </div>
                    <div className="nav-actions">
                        {user ? (
                            <UserDropdown 
                                userEmail={user.email} 
                                onLogout={handleLogout} 
                                onSettings={openSettings}
                            />
                        ) : null}
                    </div>
                </div>
            )}
            
            {/* 

            message from the frontend dev (slave)

            NEVER TOUCH #ROOT STYLE LOL!!!!!
            
            a very disgusting lesson i learned is that something has
            to be 100vh or else things are going to scale relative to their
            children. since the top bar disappears (re-renders in workspace 
            view with its relevant panel/titlebar icons) and app-container is
            a weak little percentage tag with height=100%, app-shell is the one
            forcing the scaling. everything scales relative to it. and it must
            be 100vh so that your constants will not fuck up the other scaling. 
            
            oh but sukdip! why don't you just make app-container 100vh and make
            the inner sidebar change with the currently rendered stage?

            I DON'T WANNA LINK UP ALL MY WORKSPACE VARIABLES TO THE MAIN SCREEN!
            FUCK YOU!!!!!!!

            ai will not replace us trust
            it doesn't know how to SORT TAGS and NAME DIVS
            "erm! can you please ensure the container takes up the entire space
            regardless of its contents!" OH! WIDTH 100%!!!!!!

            i think i'm just stupid actually

            my portfolio is so well maintained and scalable. minimal code. short
            styles.css (tailwind tho), and every component is completely functional 
            with the most minimal interface parameters.

            */}
            
            <div className="app-shell">


                {renderStage()}


            </div>
        </div>
    );
};
