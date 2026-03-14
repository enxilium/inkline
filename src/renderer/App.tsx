import React from "react";
import { createPortal } from "react-dom";

import { Titlebar } from "./components/layout/Titlebar";
import { GenerationProgressToast } from "./components/ui/GenerationProgressToast";
import { FeaturePromptDialog } from "./components/ui/FeaturePromptDialog";
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

const App: React.FC = () => {
    const {
        stage,
        authMode,
        authForm,
        authError,
        isAuthSubmitting,
        resetPasswordSuccess,
        user,
        projects,
        projectCovers,
        projectsStatus,
        projectsError,
        projectSelectionError,
        openingProjectId,
        bootstrapSession,
        setAuthField,
        setAuthMode,
        toggleAuthMode,
        submitAuth,
        requestPasswordReset,
        loadProjects,
        setProjectsError,
        createProject,
        deleteProject,
        renameProject,
        openProject,
        importAsset,
        importProject,
        isImporting,
        importProgress,
        pendingEditsById,
    } = useAppStore();

    // Note: Conflicts are now auto-resolved using "most recent wins" strategy.
    // The SynchronizationService handles this automatically without user intervention.

    const pendingEditsCount = React.useMemo(() => {
        return Object.keys(pendingEditsById).length;
    }, [pendingEditsById]);

    React.useEffect(() => {
        bootstrapSession();
    }, [bootstrapSession]);

    React.useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (stage !== "workspace" || pendingEditsCount === 0) {
                return;
            }

            event.preventDefault();
            // Required for Chromium to show the confirmation dialog.
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [pendingEditsCount, stage]);

    React.useEffect(() => {
        const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

        if (/Mac|iPhone|iPad|iPod/i.test(ua)) {
            document.documentElement.dataset.platform = "mac";
        } else if (/Linux/i.test(ua)) {
            document.documentElement.dataset.platform = "linux";
        } else {
            document.documentElement.dataset.platform = "windows";
        }
    }, []);

    React.useEffect(() => {
        if (!user?.preferences) {
            return;
        }

        const root = document.documentElement;
        if (user.preferences.theme) {
            root.dataset.theme = user.preferences.theme;
        }

        if (user.preferences.accentColor) {
            const val = user.preferences.accentColor;
            root.style.setProperty("--accent", val);
            root.style.setProperty("--accent-transparent", val + "11");
            root.style.setProperty("--accent-transparent2", val + "44");
            root.style.setProperty("--accent-light", val);
        }

        // Ensure legacy inline overrides are cleared so theme tokens drive colors.
        root.style.removeProperty("--text");
        root.style.removeProperty("--surface");
        root.style.removeProperty("--surface-strong");
    }, [user?.preferences?.theme, user?.preferences?.accentColor]);

    React.useEffect(() => {
        const syncTitleBarOverlay = () => {
            if (!window.windowControls?.setTitleBarOverlay) {
                return;
            }

            const styles = getComputedStyle(document.documentElement);
            const surface =
                styles.getPropertyValue("--surface").trim() || "#222324";
            const text = styles.getPropertyValue("--text").trim() || "#f6f7fb";
            const titlebarHeightRaw = styles
                .getPropertyValue("--titlebar-height")
                .trim();
            const titlebarHeight = Number.parseInt(titlebarHeightRaw, 10) || 36;

            // Keep a 1px strip for the renderer to draw the divider under native window controls.
            const overlayHeight = Math.max(0, titlebarHeight - 1);

            window.windowControls
                .setTitleBarOverlay({
                    color: surface,
                    symbolColor: text,
                    height: overlayHeight,
                })
                .catch(() => {
                    /* noop */
                });
        };

        let frameId: number | null = null;
        const scheduleSync = () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            // Run after style mutations settle (e.g. data-theme and CSS vars).
            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                syncTitleBarOverlay();
            });
        };

        const root = document.documentElement;
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (
                    mutation.type === "attributes" &&
                    (mutation.attributeName === "data-theme" ||
                        mutation.attributeName === "style")
                ) {
                    scheduleSync();
                    break;
                }
            }
        });

        observer.observe(root, {
            attributes: true,
            attributeFilter: ["data-theme", "style"],
        });

        // Initial sync after mount.
        scheduleSync();

        return () => {
            observer.disconnect();
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
        };
    }, []);

    React.useEffect(() => {
        const overlay =
            typeof navigator !== "undefined"
                ? (
                      navigator as unknown as {
                          windowControlsOverlay?: {
                              getTitlebarAreaRect?: () => {
                                  x: number;
                                  width: number;
                              };
                              addEventListener?: (
                                  type: string,
                                  listener: () => void,
                              ) => void;
                              removeEventListener?: (
                                  type: string,
                                  listener: () => void,
                              ) => void;
                          };
                      }
                  ).windowControlsOverlay
                : undefined;

        if (!overlay?.getTitlebarAreaRect) {
            return;
        }

        const root = document.documentElement;

        if (root.dataset.platform === "mac") {
            return;
        }

        const syncInsets = () => {
            const rect = overlay.getTitlebarAreaRect();
            const leftInset = Math.max(0, Math.round(rect.x));
            const rightInset = Math.max(
                0,
                Math.round(window.innerWidth - (rect.x + rect.width)),
            );

            const gutter = 10;

            // Safety clamp: on some Electron/platform combos the overlay rect can
            // report 0 inset even when native window controls are present.
            // Keep a sane minimum so those controls never overlap our buttons.
            const minLeft = 10;
            const minRight = 0;
            root.style.setProperty(
                "--titlebar-content-padding-left",
                `${Math.max(leftInset + gutter, minLeft)}px`,
            );
            root.style.setProperty(
                "--titlebar-content-padding-right",
                `${Math.max(rightInset + gutter, minRight)}px`,
            );
        };

        syncInsets();
        overlay.addEventListener("geometrychange", syncInsets);
        window.addEventListener("resize", syncInsets);
        return () => {
            overlay.removeEventListener("geometrychange", syncInsets);
            window.removeEventListener("resize", syncInsets);
        };
    }, []);

    const handleAuthSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            submitAuth().catch(() => {
                /* noop */
            });
        },
        [submitAuth],
    );

    const handleAuthFieldChange = React.useCallback(
        (field: keyof typeof authForm) =>
            (event: React.ChangeEvent<HTMLInputElement>) => {
                setAuthField(field, event.target.value);
            },
        [setAuthField],
    );

    const handleToggleAuthMode = React.useCallback(() => {
        toggleAuthMode();
    }, [toggleAuthMode]);

    const handleForgotPassword = React.useCallback(() => {
        setAuthMode("resetPassword");
    }, [setAuthMode]);

    const handleResetPassword = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            requestPasswordReset().catch(() => {
                /* noop */
            });
        },
        [requestPasswordReset],
    );

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
        [createProject, setProjectsError, user],
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
        [openProject],
    );

    const handleDeleteProject = React.useCallback(
        (projectId: string) => {
            deleteProject(projectId).catch(() => {
                /* noop */
            });
        },
        [deleteProject],
    );

    const handleRenameProject = React.useCallback(
        (projectId: string, title: string) => {
            renameProject(projectId, title).catch(() => {
                /* noop */
            });
        },
        [renameProject],
    );

    const handleUploadCover = React.useCallback(
        async (projectId: string, file: File) => {
            const arrayBuffer = await file.arrayBuffer();
            const extension = file.name.split(".").pop() || "";

            await importAsset({
                projectId,
                payload: {
                    kind: "image",
                    subjectType: "cover",
                    subjectId: projectId,
                    fileData: arrayBuffer,
                    extension,
                },
            });
        },
        [importAsset],
    );

    const titlebarHost = React.useMemo(() => {
        return document.getElementById("titlebar");
    }, []);

    const titlebar = titlebarHost
        ? createPortal(<Titlebar />, titlebarHost)
        : null;

    const renderStage = (): React.ReactNode => {
        switch (stage) {
            case "workspace":
                return <WorkspaceView />;
            case "projectSelect":
                return (
                    <ProjectSelectionView
                        projects={projects}
                        projectCovers={projectCovers}
                        status={projectsStatus}
                        error={projectsError}
                        selectionError={projectSelectionError}
                        openingProjectId={openingProjectId}
                        onRefresh={handleRefreshProjects}
                        onCreateProject={handleCreateProject}
                        onOpenProject={handleOpenProject}
                        onDeleteProject={handleDeleteProject}
                        onRenameProject={handleRenameProject}
                        onUploadCover={handleUploadCover}
                        onImportProject={importProject}
                        isImporting={isImporting}
                        importProgress={importProgress}
                    />
                );
            case "auth":
                return (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <AuthView
                            mode={authMode}
                            form={authForm}
                            error={authError}
                            isSubmitting={isAuthSubmitting}
                            resetPasswordSuccess={resetPasswordSuccess}
                            onSubmit={handleAuthSubmit}
                            onFieldChange={handleAuthFieldChange}
                            onToggleMode={handleToggleAuthMode}
                            onForgotPassword={handleForgotPassword}
                            onResetPassword={handleResetPassword}
                        />
                    </div>
                );
            case "settings":
                return <SettingsView />;
            case "checkingSession":
                return <LoadingView />;
            default:
                return <LoadingView />;
        }
    };

    return (
        <div className="app-container">
            {titlebar}

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

            <div className="app-shell">{renderStage()}</div>
            <GenerationProgressToast />
            {/* Show once per launch after user has signed in */}
            {(stage === "projectSelect" ||
                stage === "workspace" ||
                stage === "settings") && <FeaturePromptDialog />}
        </div>
    );
};

export default App;
