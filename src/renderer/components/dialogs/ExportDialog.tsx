import React, { useState, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { FolderOpenIcon, DownloadIcon } from "../ui/Icons";

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectTitle: string;
    chapterCount: number;
    wordCount: number;
    onExport: (options: {
        filename: string;
        author: string;
        destinationPath: string;
    }) => Promise<void>;
}

/**
 * Sanitises a string for use as a cross-platform filename.
 * Strips characters that are illegal on Windows/macOS/Linux and collapses
 * runs of whitespace into a single space.
 */
function sanitizeFilename(raw: string): string {
    return raw
        .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
    open,
    onOpenChange,
    projectTitle,
    chapterCount,
    wordCount,
    onExport,
}) => {
    const [filename, setFilename] = useState(
        () => sanitizeFilename(projectTitle) || "manuscript",
    );
    const [author, setAuthor] = useState("");
    const [folder, setFolder] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const browseFolder = useCallback(async () => {
        try {
            const result = await window.fileDialog.showSaveDialog({
                title: "Choose export location",
                defaultPath: `${sanitizeFilename(filename) || "manuscript"}.epub`,
                filters: [{ name: "EPUB", extensions: ["epub"] }],
            });
            if (!result.canceled && result.filePath) {
                // Extract directory from the full path
                const sep = result.filePath.includes("/") ? "/" : "\\";
                const parts = result.filePath.split(sep);
                const file = parts.pop() || "";
                setFolder(parts.join(sep));

                // If the user changed the filename in the native dialog, sync it back
                const nameWithoutExt = file.replace(/\.epub$/i, "");
                if (nameWithoutExt) {
                    setFilename(nameWithoutExt);
                }
            }
        } catch {
            // User cancelled or Electron error – ignore
        }
    }, [filename]);

    const handleExport = useCallback(async () => {
        setError(null);

        const cleanFilename = sanitizeFilename(filename) || "manuscript";

        if (!folder) {
            setError("Please choose a save location first.");
            return;
        }

        setIsExporting(true);
        try {
            const sep = folder.includes("/") ? "/" : "\\";
            const destinationPath = `${folder}${sep}${cleanFilename}.epub`;

            await onExport({
                filename: cleanFilename,
                author: author.trim() || "Unknown",
                destinationPath,
            });

            onOpenChange(false);
        } catch (err) {
            setError((err as Error)?.message ?? "Export failed.");
        } finally {
            setIsExporting(false);
        }
    }, [filename, folder, author, onExport, onOpenChange]);

    const estimatedPages = Math.max(1, Math.ceil(wordCount / 250));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="export-dialog-content">
                <DialogHeader>
                    <DialogTitle>Export Manuscript</DialogTitle>
                    <DialogDescription>
                        Export your manuscript as an EPUB ebook.
                    </DialogDescription>
                </DialogHeader>

                <div className="dialog-form">
                    <div className="dialog-field">
                        <Label htmlFor="export-filename">Filename</Label>
                        <div className="export-dialog-filename-row">
                            <Input
                                id="export-filename"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                placeholder="manuscript"
                                disabled={isExporting}
                            />
                            <span className="export-dialog-ext">.epub</span>
                        </div>
                    </div>

                    <div className="dialog-field">
                        <Label htmlFor="export-author">Author</Label>
                        <Input
                            id="export-author"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            placeholder="Author name (optional)"
                            disabled={isExporting}
                        />
                    </div>

                    <div className="dialog-field">
                        <Label>Save location</Label>
                        <button
                            type="button"
                            className="export-dialog-location-btn"
                            onClick={browseFolder}
                            disabled={isExporting}
                        >
                            <FolderOpenIcon size={16} />
                            <span className="export-dialog-location-text">
                                {folder || "Choose a folder…"}
                            </span>
                        </button>
                    </div>

                    {error ? (
                        <div className="export-dialog-error">{error}</div>
                    ) : null}

                    <div className="export-dialog-footer">
                        <span className="export-dialog-summary">
                            {chapterCount}{" "}
                            {chapterCount === 1 ? "chapter" : "chapters"}
                            {" · "}
                            {wordCount.toLocaleString()} words
                            {" · ~"}
                            {estimatedPages}{" "}
                            {estimatedPages === 1 ? "page" : "pages"}
                        </span>
                        <div className="dialog-actions">
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                disabled={isExporting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleExport}
                                disabled={isExporting || !folder}
                            >
                                <DownloadIcon size={16} />
                                {isExporting ? "Exporting…" : "Export EPUB"}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
