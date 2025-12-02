import React from "react";
import { Button } from "../ui/Button";

interface WorkspaceHeaderProps {
    activeProjectName: string;
    onSwitchProject: () => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
    activeProjectName,
    onSwitchProject,
}) => {
    return (
        <div className="workspace-header">
            <div>
                <p className="panel-label">Active project</p>
                <h2>{activeProjectName || "Workspace"}</h2>
            </div>
            <div className="workspace-header-actions">
                <Button type="button" variant="ghost" onClick={onSwitchProject}>
                    Switch project
                </Button>
            </div>
        </div>
    );
};
