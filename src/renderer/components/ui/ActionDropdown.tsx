import * as React from "react";
import { PlusIcon, ChevronDownIcon } from "./Icons";

export interface ActionDropdownOption {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

export interface ActionDropdownProps {
    options: ActionDropdownOption[];
    disabled?: boolean;
    size?: number;
}

export const ActionDropdown: React.FC<ActionDropdownProps> = ({
    options,
    disabled,
    size = 16,
}) => {
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (!open) return;
        const handleClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    return (
        <div className="action-dropdown" ref={containerRef}>
            <button
                type="button"
                className="action-dropdown-trigger"
                onClick={() => setOpen((v) => !v)}
                disabled={disabled}
            >
                <PlusIcon size={size} />
            </button>
            {open && (
                <div className="action-dropdown-menu">
                    {options.map((opt, i) => (
                        <button
                            key={i}
                            type="button"
                            className="action-dropdown-item"
                            disabled={opt.disabled}
                            onClick={() => {
                                opt.onClick();
                                setOpen(false);
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
