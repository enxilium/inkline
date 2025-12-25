import React from "react";

import { Button } from "../ui/Button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "../ui/Dialog";
import { useAppStore } from "../../state/appStore";

const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    });
};

const getEntityTypeLabel = (entityType: string): string => {
    switch (entityType) {
        case "chapter":
            return "Chapter";
        case "character":
            return "Character";
        case "location":
            return "Location";
        case "organization":
            return "Organization";
        case "scrapNote":
            return "Scrap Note";
        case "image":
            return "Image";
        case "bgm":
            return "Background Music";
        case "playlist":
            return "Playlist";
        case "project":
            return "Project";
        default:
            return entityType;
    }
};

export const ConflictResolutionDialog: React.FC = () => {
    const { pendingConflict, resolveConflict } = useAppStore();
    const [isResolving, setIsResolving] = React.useState(false);

    if (!pendingConflict) {
        return null;
    }

    const handleAcceptRemote = async () => {
        setIsResolving(true);
        try {
            await resolveConflict("accept-remote");
        } finally {
            setIsResolving(false);
        }
    };

    const handleKeepLocal = async () => {
        setIsResolving(true);
        try {
            await resolveConflict("keep-local");
        } finally {
            setIsResolving(false);
        }
    };

    const entityTypeLabel = getEntityTypeLabel(pendingConflict.entityType);

    // Handler that does nothing - dialog can only be closed by resolving
    const handleOpenChange = React.useCallback((open: boolean) => {
        // Prevent closing without resolution
        if (!open) return;
    }, []);

    return (
        <Dialog open={true} onOpenChange={handleOpenChange}>
            <DialogContent className="conflict-dialog">
                <DialogHeader>
                    <DialogTitle>Sync Conflict Detected</DialogTitle>
                    <DialogDescription>
                        Another device has made changes to{" "}
                        <strong>"{pendingConflict.entityName}"</strong> (
                        {entityTypeLabel}).
                        <br />
                        Please choose which version to keep.
                    </DialogDescription>
                </DialogHeader>

                <div className="conflict-dialog-details">
                    <div className="conflict-option conflict-option-local">
                        <div className="conflict-option-header">
                            <span className="conflict-option-label">
                                Your Local Version
                            </span>
                            <span className="conflict-option-time">
                                Modified:{" "}
                                {formatDate(pendingConflict.localUpdatedAt)}
                            </span>
                        </div>
                        <p className="conflict-option-description">
                            Keep your local changes and overwrite the cloud
                            version. Other devices will receive your version.
                        </p>
                    </div>

                    <div className="conflict-option conflict-option-remote">
                        <div className="conflict-option-header">
                            <span className="conflict-option-label">
                                Cloud Version
                            </span>
                            <span className="conflict-option-time">
                                Modified:{" "}
                                {formatDate(pendingConflict.remoteUpdatedAt)}
                            </span>
                        </div>
                        <p className="conflict-option-description">
                            Accept the cloud version and discard your local
                            changes. Your current work on this item will be
                            replaced.
                        </p>
                    </div>
                </div>

                <div className="dialog-actions conflict-dialog-actions">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={handleKeepLocal}
                        disabled={isResolving}
                    >
                        Keep My Version
                    </Button>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleAcceptRemote}
                        disabled={isResolving}
                    >
                        Accept Cloud Version
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
