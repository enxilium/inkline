import * as React from "react";
import classNames from "clsx";
import { CloseIcon } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectOption {
    id: string;
    label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SearchableSelect – Single selection with search
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchableSelectProps {
    value: string;
    options: SelectOption[];
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    emptyLabel?: string;
    className?: string;
    allowClear?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    options,
    onChange,
    onBlur,
    placeholder = "Search...",
    emptyLabel = "Unassigned",
    className,
    allowClear = true,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectedOption = options.find((opt) => opt.id === value);

    const filteredOptions = React.useMemo(() => {
        if (!searchQuery.trim()) {
            return options;
        }
        const query = searchQuery.toLowerCase();
        return options.filter((opt) => opt.label.toLowerCase().includes(query));
    }, [options, searchQuery]);

    const handleOpen = () => {
        setIsOpen(true);
        setSearchQuery("");
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchQuery("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setIsOpen(false);
            setSearchQuery("");
        } else if (e.key === "Enter" && filteredOptions.length > 0) {
            e.preventDefault();
            handleSelect(filteredOptions[0].id);
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        // Check if focus is moving outside the container
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
            setSearchQuery("");
            onBlur?.();
        }
    };

    return (
        <div
            ref={containerRef}
            className={classNames("searchable-select", className, {
                "is-open": isOpen,
            })}
            onBlur={handleBlur}
        >
            {isOpen ? (
                <div className="searchable-select-input-wrapper">
                    <input
                        ref={inputRef}
                        type="text"
                        className="searchable-select-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                    />
                </div>
            ) : (
                <button
                    type="button"
                    className="searchable-select-trigger"
                    onClick={handleOpen}
                >
                    <span
                        className={classNames("searchable-select-value", {
                            "is-placeholder": !selectedOption,
                        })}
                    >
                        {selectedOption?.label || emptyLabel}
                    </span>
                    {allowClear && value && (
                        <span
                            className="searchable-select-clear"
                            onClick={handleClear}
                        >
                            <CloseIcon size={14} />
                        </span>
                    )}
                </button>
            )}

            {isOpen && (
                <div className="searchable-select-dropdown">
                    {allowClear && (
                        <button
                            type="button"
                            className={classNames("searchable-select-option", {
                                "is-selected": !value,
                            })}
                            onClick={() => handleSelect("")}
                        >
                            <span className="option-label is-placeholder">
                                {emptyLabel}
                            </span>
                        </button>
                    )}
                    {filteredOptions.length === 0 ? (
                        <div className="searchable-select-empty">
                            No matches found
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className={classNames(
                                    "searchable-select-option",
                                    { "is-selected": option.id === value }
                                )}
                                onClick={() => handleSelect(option.id)}
                            >
                                <span className="option-label">
                                    {option.label}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SearchableMultiSelect – Multiple selection with search, tag-like display
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchableMultiSelectProps {
    value: string[];
    options: SelectOption[];
    onChange: (value: string[]) => void;
    onBlur?: () => void;
    placeholder?: string;
    className?: string;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
    value,
    options,
    onChange,
    onBlur,
    placeholder = "Search to add...",
    className,
}) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const selectedOptions = React.useMemo(() => {
        return value
            .map((id) => options.find((opt) => opt.id === id))
            .filter((opt): opt is SelectOption => opt !== undefined);
    }, [value, options]);

    const availableOptions = React.useMemo(() => {
        const selectedIds = new Set(value);
        let filtered = options.filter((opt) => !selectedIds.has(opt.id));

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((opt) =>
                opt.label.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [options, value, searchQuery]);

    const handleOpen = () => {
        setIsOpen(true);
        setSearchQuery("");
        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    };

    const handleAdd = (optionId: string) => {
        if (!value.includes(optionId)) {
            onChange([...value, optionId]);
        }
        setSearchQuery("");
        inputRef.current?.focus();
    };

    const handleRemove = (optionId: string) => {
        onChange(value.filter((id) => id !== optionId));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            setIsOpen(false);
            setSearchQuery("");
        } else if (e.key === "Enter" && availableOptions.length > 0) {
            e.preventDefault();
            handleAdd(availableOptions[0].id);
        } else if (e.key === "Backspace" && !searchQuery && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
            setSearchQuery("");
            onBlur?.();
        }
    };

    return (
        <div
            ref={containerRef}
            className={classNames("searchable-multi-select", className, {
                "is-open": isOpen,
            })}
            onBlur={handleBlur}
        >
            <div
                className="searchable-multi-select-container"
                onClick={handleOpen}
            >
                {selectedOptions.map((option) => (
                    <span key={option.id} className="tag-chip">
                        {option.label}
                        <button
                            type="button"
                            className="tag-remove-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(option.id);
                            }}
                        >
                            <CloseIcon size={12} />
                        </button>
                    </span>
                ))}
                {isOpen ? (
                    <input
                        ref={inputRef}
                        type="text"
                        className="searchable-multi-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                            selectedOptions.length === 0 ? placeholder : ""
                        }
                    />
                ) : (
                    <span
                        className={classNames("searchable-multi-placeholder", {
                            hidden: selectedOptions.length > 0,
                        })}
                    >
                        {placeholder}
                    </span>
                )}
            </div>

            {isOpen && (
                <div className="searchable-select-dropdown">
                    {availableOptions.length === 0 ? (
                        <div className="searchable-select-empty">
                            {value.length === options.length
                                ? "All items selected"
                                : "No matches found"}
                        </div>
                    ) : (
                        availableOptions.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                className="searchable-select-option"
                                onClick={() => handleAdd(option.id)}
                            >
                                <span className="option-label">
                                    {option.label}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
