import React from "react";
import classNames from "clsx";

import { Button } from "./ui/Button";

type ToolbarButtonProps = {
    label: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
};

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    label,
    onClick,
    isActive,
    disabled,
}) => (
    <Button
        type="button"
        variant="toolbar"
        className={classNames({ "is-active": isActive })}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isActive}
    >
        {label}
    </Button>
);
