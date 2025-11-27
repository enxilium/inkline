import React from "react";

import { Button } from "../ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";

export type LinkDialogProps = {
    open: boolean;
    initialUrl: string;
    onOpenChange: (open: boolean) => void;
    onSubmit: (url: string) => void;
};

export const LinkDialog: React.FC<LinkDialogProps> = ({
    open,
    initialUrl,
    onOpenChange,
    onSubmit,
}) => {
    const [url, setUrl] = React.useState(initialUrl);

    React.useEffect(() => {
        setUrl(initialUrl);
    }, [initialUrl]);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSubmit(url.trim());
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit link</DialogTitle>
                </DialogHeader>
                <form className="dialog-form" onSubmit={handleSubmit}>
                    <Label htmlFor="link-url">Destination URL</Label>
                    <Input
                        id="link-url"
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        autoFocus
                    />
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            Save link
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
