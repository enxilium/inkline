import React from "react";

import { Button } from "../ui/Button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

export type ShortcutField = {
    id: string;
    label: string;
    type?: "text" | "number";
    placeholder?: string;
    defaultValue?: string;
};

export type ShortcutDialogProps = {
    open: boolean;
    title: string;
    description: string;
    fields: ShortcutField[];
    values: Record<string, string>;
    onChange: (fieldId: string, value: string) => void;
    onCancel: () => void;
    onSubmit: () => void;
    isSubmitting?: boolean;
};

export const ShortcutDialog: React.FC<ShortcutDialogProps> = ({
    open,
    title,
    description,
    fields,
    values,
    onChange,
    onCancel,
    onSubmit,
    isSubmitting = false,
}) => {
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit();
    };

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <form className="dialog-form" onSubmit={handleSubmit}>
                    {fields.map((field) => (
                        <div className="dialog-field" key={field.id}>
                            <Label htmlFor={`shortcut-${field.id}`}>
                                {field.label}
                            </Label>
                            <Input
                                id={`shortcut-${field.id}`}
                                type={field.type ?? "text"}
                                placeholder={field.placeholder}
                                value={values[field.id] ?? ""}
                                onChange={(event) =>
                                    onChange(field.id, event.target.value)
                                }
                                required
                            />
                        </div>
                    ))}
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
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Running…" : "Run shortcut"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
