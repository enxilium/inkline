import * as React from "react";
import classNames from "clsx";
import { CloseIcon } from "./Icons";
import { renderSelectOptionIcon } from "./selectOptionIconCatalog";

// ─────────────────────────────────────────────────────────────────────────────
// TraitsInput Component
// ─────────────────────────────────────────────────────────────────────────────

export interface TraitsInputProps {
    value: string[];
    options: Array<{ id: string; label: string; icon?: string }>;
    onChange: (selectedOptionIds: string[]) => void;
    onCreateOption?: (label: string) => Promise<{ id: string; label: string } | null>;
    onBlur?: () => void;
    placeholder?: string;
    className?: string;
}

export const TraitsInput: React.FC<TraitsInputProps> = ({
    value,
    options,
    onChange,
    onCreateOption,
    onBlur,
    placeholder = "Add a trait...",
    className,
}) => {
    const [inputValue, setInputValue] = React.useState("");
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const [isCreatingOption, setIsCreatingOption] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const optionById = React.useMemo(
        () => new Map(options.map((option) => [option.id, option])),
        [options],
    );

    const normalizedToOption = React.useMemo(() => {
        const map = new Map<string, { id: string; label: string; icon?: string }>();
        for (const option of options) {
            map.set(option.label.trim().toLowerCase(), option);
        }
        return map;
    }, [options]);

    // Filter suggestions based on input
    const filteredSuggestions = React.useMemo(() => {
        const query = inputValue.trim().toLowerCase();
        return options
            .filter((option) => !value.includes(option.id))
            .filter((option) =>
                query ? option.label.toLowerCase().includes(query) : true,
            )
            .slice(0, query ? 8 : 12);
    }, [inputValue, options, value]);

    const addOrCreateOption = React.useCallback(
        async (rawInput: string) => {
            const label = rawInput.trim();
            if (!label) {
                return;
            }

            const existingOption = normalizedToOption.get(label.toLowerCase());
            if (existingOption) {
                if (!value.includes(existingOption.id)) {
                    onChange([...value, existingOption.id]);
                }
                setInputValue("");
                setShowSuggestions(false);
                return;
            }

            if (!onCreateOption) {
                setShowSuggestions(false);
                return;
            }

            setIsCreatingOption(true);
            try {
                const created = await onCreateOption(label);
                if (created && !value.includes(created.id)) {
                    onChange([...value, created.id]);
                }
            } finally {
                setIsCreatingOption(false);
            }

            setInputValue("");
            setShowSuggestions(false);
        },
        [normalizedToOption, onChange, onCreateOption, value],
    );

    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            await addOrCreateOption(inputValue);
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    const removeOption = (optionIdToRemove: string) => {
        onChange(value.filter((optionId) => optionId !== optionIdToRemove));
    };

    const addExistingOption = (optionId: string) => {
        if (!value.includes(optionId)) {
            onChange([...value, optionId]);
        }
        setInputValue("");
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            if (inputValue.trim()) {
                void addOrCreateOption(inputValue);
            }
            setShowSuggestions(false);
            onBlur?.();
        }
    };

    const handleFocus = () => {
        setShowSuggestions(true);
    };

    return (
        <div
            ref={containerRef}
            className={classNames("traits-input-wrapper", className)}
            onBlur={handleBlur}
        >
            <div className="traits-input-container">
                {value.map((optionId) => {
                    const option = optionById.get(optionId);
                    if (!option) {
                        return null;
                    }

                    const icon = renderSelectOptionIcon(option.icon, 14);
                    return (
                        <span key={optionId} className="trait-chip">
                            <span className="trait-icon">{icon}</span>
                            <span className="trait-label">{option.label}</span>
                            <button
                                type="button"
                                className="tag-remove-btn"
                                onClick={() => removeOption(optionId)}
                                disabled={isCreatingOption}
                            >
                                <CloseIcon size={12} />
                            </button>
                        </span>
                    );
                })}
                <input
                    ref={inputRef}
                    type="text"
                    className="traits-input-field"
                    disabled={isCreatingOption}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={value.length === 0 ? placeholder : ""}
                />
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="traits-suggestions-dropdown">
                    {filteredSuggestions.map((option) => {
                        const icon = renderSelectOptionIcon(option.icon, 14);
                        return (
                            <button
                                key={option.id}
                                type="button"
                                className="traits-suggestion-item"
                                onClick={() => addExistingOption(option.id)}
                                disabled={isCreatingOption}
                            >
                                <span className="trait-icon">{icon}</span>
                                <span className="trait-label">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
