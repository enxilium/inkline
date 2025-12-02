import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

interface ExportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onExport: (format: "pdf" | "docx" | "epub", path: string) => Promise<void>;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
    open,
    onOpenChange,
    onExport,
}) => {
    const [format, setFormat] = useState<"pdf" | "docx" | "epub">("pdf");
    const [path, setPath] = useState(
        "C:\\Users\\Public\\Documents\\export.pdf"
    );
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await onExport(format, path);
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert("Export failed: " + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Export Manuscript</DialogTitle>
                </DialogHeader>
                <div className="dialog-body">
                    <div className="form-group">
                        <Label>Format</Label>
                        <select
                            className="input"
                            value={format}
                            onChange={(e) => {
                                const newFormat = e.target.value as
                                    | "pdf"
                                    | "docx"
                                    | "epub";
                                setFormat(newFormat);
                                setPath((prev) =>
                                    prev.replace(
                                        /\.(pdf|docx|epub)$/,
                                        `.${newFormat}`
                                    )
                                );
                            }}
                        >
                            <option value="pdf">PDF</option>
                            <option value="docx">Word (DOCX)</option>
                            <option value="epub">EPUB</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <Label>Destination Path</Label>
                        <Input
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                        />
                    </div>
                </div>
                <div className="dialog-footer">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        {isExporting ? "Exporting..." : "Export"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
