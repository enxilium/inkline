import React from "react";
import cx from "clsx";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/Dialog";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { useAppStore } from "../../state/appStore";
import { getTextStats } from "../../utils/textStats";
import { EditChapterRangeDialog } from "../dialogs/EditChapterRangeDialog";

type MenuKey = "file" | "edit" | null;

export const TitlebarMenuBar: React.FC = () => {
    const {
        projectId,
        exportManuscript,
        returnToProjects,
        chapters,
        editChapters,
        addPendingEdits,
        hasPendingEditsForChapter,
        setActiveDocument,
    } = useAppStore();
    const [openMenu, setOpenMenu] = React.useState<MenuKey>(null);
    const [isRangeDialogOpen, setIsRangeDialogOpen] = React.useState(false);
    const [isProjectStatsOpen, setIsProjectStatsOpen] = React.useState(false);
    const [rangeStart, setRangeStart] = React.useState("");
    const [rangeEnd, setRangeEnd] = React.useState("");
    const [isApplyingEdits, setIsApplyingEdits] = React.useState(false);

    const manuscriptWordCount = React.useMemo(() => {
        return chapters.reduce((sum, chapter) => {
            return sum + getTextStats(chapter.content).wordCount;
        }, 0);
    }, [chapters]);

    const estimatedPages = React.useMemo(() => {
        const wordsPerPage = 250;
        return Math.max(1, Math.ceil(manuscriptWordCount / wordsPerPage));
    }, [manuscriptWordCount]);

    React.useEffect(() => {
        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) {
                return;
            }

            if (target.closest("[data-titlebar-menubar-root]")) {
                return;
            }

            setOpenMenu(null);
        };

        document.addEventListener("mousedown", handleMouseDown);
        return () => document.removeEventListener("mousedown", handleMouseDown);
    }, []);

    const toggleMenu = (key: Exclude<MenuKey, null>) => {
        setOpenMenu((current) => (current === key ? null : key));
    };

    const openOnHoverIfAnyOpen = (key: Exclude<MenuKey, null>) => {
        setOpenMenu((current) => {
            if (!current) {
                return current;
            }
            return current === key ? current : key;
        });
    };

    return (
        <div className="titlebar-menubar" data-titlebar-menubar-root>
            <div className="titlebar-menubar-row">
                <div className="titlebar-menubar-item">
                    <button
                        type="button"
                        className={cx(
                            "titlebar-menubar-button titlebar-no-drag",
                            openMenu === "file" && "is-open"
                        )}
                        onClick={() => toggleMenu("file")}
                        onMouseEnter={() => openOnHoverIfAnyOpen("file")}
                    >
                        File
                    </button>

                    {openMenu === "file" ? (
                        <div
                            className="titlebar-menu titlebar-no-drag"
                            role="menu"
                        >
                            <button
                                type="button"
                                className="project-card-menu-item"
                                role="menuitem"
                                onClick={() => {
                                    setOpenMenu(null);
                                    returnToProjects().catch((error) => {
                                        alert(
                                            "Unable to leave project: " +
                                                ((error as Error)?.message ??
                                                    "Unknown error")
                                        );
                                    });
                                }}
                            >
                                Open Project...
                            </button>
                            <button
                                type="button"
                                className="project-card-menu-item"
                                role="menuitem"
                                onClick={() => {
                                    setOpenMenu(null);
                                    const destinationPath = window.prompt(
                                        "Enter destination path (e.g. C:\\Users\\Name\\Desktop\\story.pdf):"
                                    );
                                    if (!destinationPath) return;

                                    exportManuscript({
                                        projectId,
                                        format: "pdf",
                                        destinationPath,
                                    })
                                        .then(() => {
                                            alert("Export complete!");
                                        })
                                        .catch((error) => {
                                            alert(
                                                "Export failed: " +
                                                    ((error as Error)
                                                        ?.message ??
                                                        "Unknown error")
                                            );
                                        });
                                }}
                            >
                                Export Manuscript...
                            </button>

                            <button
                                type="button"
                                className="project-card-menu-item"
                                role="menuitem"
                                onClick={() => {
                                    setOpenMenu(null);
                                    setIsProjectStatsOpen(true);
                                }}
                            >
                                Project Statistics
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="titlebar-menubar-item">
                    <button
                        type="button"
                        className={cx(
                            "titlebar-menubar-button titlebar-no-drag",
                            openMenu === "edit" && "is-open"
                        )}
                        onClick={() => toggleMenu("edit")}
                        onMouseEnter={() => openOnHoverIfAnyOpen("edit")}
                    >
                        Edit
                    </button>

                    {openMenu === "edit" ? (
                        <div
                            className="titlebar-menu titlebar-no-drag"
                            role="menu"
                        >
                            <button
                                type="button"
                                className="project-card-menu-item"
                                role="menuitem"
                                onClick={() => {
                                    setOpenMenu(null);
                                    setIsRangeDialogOpen(true);
                                }}
                            >
                                Edit Chapter Range...
                            </button>
                            <button
                                type="button"
                                className="project-card-menu-item"
                                role="menuitem"
                                onClick={() => {
                                    setOpenMenu(null);
                                    // UI only for now.
                                }}
                            >
                                Analyze Selected Text
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            <EditChapterRangeDialog
                open={isRangeDialogOpen}
                startValue={rangeStart}
                endValue={rangeEnd}
                onStartChange={setRangeStart}
                onEndChange={setRangeEnd}
                onCancel={() => setIsRangeDialogOpen(false)}
                isSubmitting={isApplyingEdits}
                onApply={() => {
                    const start = Number.parseInt(rangeStart.trim(), 10);
                    const end = rangeEnd.trim()
                        ? Number.parseInt(rangeEnd.trim(), 10)
                        : start;

                    if (!Number.isFinite(start) || start <= 0) {
                        alert("Please enter a valid start chapter number.");
                        return;
                    }
                    if (!Number.isFinite(end) || end <= 0) {
                        alert("Please enter a valid end chapter number.");
                        return;
                    }

                    const sorted = chapters
                        .slice()
                        .sort((a, b) => a.order - b.order);

                    const low = Math.min(start, end);
                    const high = Math.max(start, end);
                    const selected = sorted.slice(low - 1, high);

                    if (selected.length === 0) {
                        alert("No chapters found in that range.");
                        return;
                    }

                    const chapterIds = selected.map((c) => c.id);
                    const blocked = chapterIds.find((id) =>
                        hasPendingEditsForChapter(id)
                    );
                    if (blocked) {
                        alert(
                            "One or more chapters already have pending edits. Resolve or dismiss them before editing that range again."
                        );
                        return;
                    }

                    setIsApplyingEdits(true);
                    editChapters({ projectId, chapterIds })
                        .then((result) => {
                            addPendingEdits(result);

                            // Open as tabs (like user opening documents) and focus the first.
                            for (const id of chapterIds) {
                                setActiveDocument({ kind: "chapter", id });
                            }
                            setActiveDocument({
                                kind: "chapter",
                                id: chapterIds[0],
                            });

                            setIsRangeDialogOpen(false);
                        })
                        .catch((error) => {
                            alert(
                                "Edit failed: " +
                                    ((error as Error)?.message ??
                                        "Unknown error")
                            );
                        })
                        .finally(() => {
                            setIsApplyingEdits(false);
                        });
                }}
            />

            <Dialog
                open={isProjectStatsOpen}
                onOpenChange={setIsProjectStatsOpen}
            >
                <DialogContent className="titlebar-range-dialog">
                    <DialogHeader>
                        <DialogTitle>Project Statistics</DialogTitle>
                        <DialogDescription>
                            Manuscript totals (chapters only).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="dialog-form">
                        <div className="dialog-field">
                            <Label>Total word count</Label>
                            <div className="status-pill is-muted">
                                {manuscriptWordCount.toLocaleString()} words
                            </div>
                        </div>
                        <div className="dialog-field">
                            <Label>Estimated paperback pages</Label>
                            <div className="status-pill is-muted">
                                {estimatedPages.toLocaleString()} pages
                            </div>
                            <div className="dialog-hint">
                                Based on ~250 words per page.
                            </div>
                        </div>

                        <div className="dialog-actions">
                            <Button
                                type="button"
                                variant="primary"
                                onClick={() => setIsProjectStatsOpen(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
