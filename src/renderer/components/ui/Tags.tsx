import * as React from "react";
import classNames from "clsx";
import { CloseIcon } from "./Icons";

export interface TagsInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    onBlur?: () => void;
    placeholder?: string;
    className?: string;
}

export const TagsInput: React.FC<TagsInputProps> = ({
    value,
    onChange,
    onBlur,
    placeholder = "Add a tag...",
    className,
}) => {
    const [inputValue, setInputValue] = React.useState("");

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const newTag = inputValue.trim();
            if (newTag && !value.includes(newTag)) {
                onChange([...value, newTag]);
                setInputValue("");
            }
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter((tag) => tag !== tagToRemove));
    };

    const handleBlur = () => {
        const newTag = inputValue.trim();
        if (newTag && !value.includes(newTag)) {
            onChange([...value, newTag]);
            setInputValue("");
        }
        if (onBlur) {
            onBlur();
        }
    };

    return (
        <div className={classNames("tags-input-container", className)}>
            {value.map((tag) => (
                <span key={tag} className="tag-chip">
                    {tag}
                    <button
                        type="button"
                        className="tag-remove-btn"
                        onClick={() => removeTag(tag)}
                    >
                        <CloseIcon size={12} />
                    </button>
                </span>
            ))}
            <input
                type="text"
                className="tags-input-field"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={value.length === 0 ? placeholder : ""}
            />
        </div>
    );
};
