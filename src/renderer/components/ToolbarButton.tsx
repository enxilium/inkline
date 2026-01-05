import React from "react";
import classNames from "clsx";

import { Button } from "./ui/Button";

type ToolbarButtonProps = {
    label: React.ReactNode;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title?: string;
};

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    label,
    onClick,
    isActive,
    disabled,
    title,
}) => (
    <Button
        type="button"
        variant="toolbar"
        className={classNames({ "is-active": isActive })}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isActive}
        title={title}
    >
        {label}
    </Button>
);
