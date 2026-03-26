import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";

interface ReportIssueDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (description: string) => Promise<void>;
}

export const ReportIssueDialog: React.FC<ReportIssueDialogProps> = ({
    open,
    onOpenChange,
    onSubmit,
}) => {
    const [description, setDescription] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            setDescription("");
            setError(null);
            setIsSubmitting(false);
        }
    }, [open]);

    const handleSubmit = React.useCallback(async () => {
        const note = description.trim();
        if (!note) {
            setError("Please describe the issue before sending.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit(note);
            onOpenChange(false);
        } catch (submitError) {
            setError(
                (submitError as Error)?.message ??
                    "Unable to submit your report right now.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [description, onOpenChange, onSubmit]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="titlebar-range-dialog">
                <DialogHeader>
                    <DialogTitle>Report Issue</DialogTitle>
                    <DialogDescription>
                        Tell us what happened and we will investigate.
                    </DialogDescription>
                </DialogHeader>

                <div className="dialog-form">
                    <div className="dialog-field">
                        <Label htmlFor="report-issue-description">
                            What went wrong?
                        </Label>
                        <textarea
                            id="report-issue-description"
                            className="text-area"
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Describe the issue and steps to reproduce it."
                            rows={6}
                            maxLength={1200}
                            disabled={isSubmitting}
                        />
                    </div>

                    {error ? (
                        <div className="report-issue-error">{error}</div>
                    ) : null}

                    <DialogFooter className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting || !description.trim()}
                        >
                            {isSubmitting ? "Sending..." : "Send"}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
};
