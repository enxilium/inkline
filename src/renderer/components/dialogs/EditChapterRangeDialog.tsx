import React from "react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";

export type EditChapterRangeDialogProps = {
    open: boolean;
    startValue: string;
    endValue: string;
    onStartChange: (value: string) => void;
    onEndChange: (value: string) => void;
    onCancel: () => void;
    onApply: () => void;
    isSubmitting?: boolean;
};

export const EditChapterRangeDialog: React.FC<EditChapterRangeDialogProps> = ({
    open,
    startValue,
    endValue,
    onStartChange,
    onEndChange,
    onCancel,
    onApply,
    isSubmitting = false,
}) => {
    return (
        <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
            <DialogContent className="titlebar-range-dialog">
                <DialogHeader>
                    <DialogTitle>Edit Chapter Range</DialogTitle>
                    <DialogDescription>
                        Choose a start and end chapter.
                    </DialogDescription>
                </DialogHeader>

                <div className="dialog-form">
                    <div className="dialog-field">
                        <Label htmlFor="chapter-range-start">Start</Label>
                        <Input
                            id="chapter-range-start"
                            value={startValue}
                            onChange={(e) => onStartChange(e.target.value)}
                            placeholder="e.g. 1"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div className="dialog-field">
                        <Label htmlFor="chapter-range-end">End</Label>
                        <Input
                            id="chapter-range-end"
                            value={endValue}
                            onChange={(e) => onEndChange(e.target.value)}
                            placeholder="e.g. 10"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onApply}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Applying…" : "Apply"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
