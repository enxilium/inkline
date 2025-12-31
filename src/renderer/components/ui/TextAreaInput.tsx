import * as React from "react";
import classNames from "clsx";
import type { DocumentRef, DocumentRefKind } from "./ListInput";

// Re-export types for convenience
export type { DocumentRef, DocumentRefKind };

// ─────────────────────────────────────────────────────────────────────────────
// TextAreaInput Component - Textarea with slash-command reference support
// ─────────────────────────────────────────────────────────────────────────────

export interface TextAreaInputProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    rows?: number;
    className?: string;
    id?: string;
    /** Available documents for slash-command references */
    availableDocuments?: DocumentRef[];
    /** Callback when a reference is clicked in preview */
    onReferenceClick?: (ref: DocumentRef) => void;
}

export const TextAreaInput: React.FC<TextAreaInputProps> = ({
    value,
    onChange,
    onBlur,
    placeholder,
    rows = 4,
    className,
    id,
    availableDocuments = [],
    onReferenceClick,
}) => {
    const [showRefSuggestions, setShowRefSuggestions] = React.useState(false);
    const [refQuery, setRefQuery] = React.useState("");
    const [cursorPosition, setCursorPosition] = React.useState<{
        top: number;
        left: number;
    } | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Filter documents for slash-command suggestions
    const filteredDocuments = React.useMemo(() => {
        if (!refQuery) return availableDocuments.slice(0, 8);
        const query = refQuery.toLowerCase();
        return availableDocuments
            .filter((doc) => doc.name.toLowerCase().includes(query))
            .slice(0, 8);
    }, [availableDocuments, refQuery]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;
        onChange(newValue);

        // Check for slash command at current cursor position
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

        if (lastSlashIndex !== -1) {
            const afterSlash = textBeforeCursor.slice(lastSlashIndex + 1);
            const beforeSlash = textBeforeCursor.slice(0, lastSlashIndex);
            const lastChar = beforeSlash.slice(-1);

            // Only show suggestions if slash is at start of line or after whitespace
            if (
                lastChar === "" ||
                lastChar === " " ||
                lastChar === "\n" ||
                lastSlashIndex === 0
            ) {
                // Check there's no space after the slash (still typing the query)
                if (!afterSlash.includes(" ") && !afterSlash.includes("\n")) {
                    setRefQuery(afterSlash);
                    setShowRefSuggestions(true);

                    // Calculate position for dropdown (approximation)
                    if (textareaRef.current) {
                        const textarea = textareaRef.current;
                        const rect = textarea.getBoundingClientRect();
                        const lineHeight = parseInt(
                            getComputedStyle(textarea).lineHeight || "20"
                        );
                        const lines = textBeforeCursor.split("\n");
                        const currentLineIndex = lines.length - 1;
                        const top = Math.min(
                            currentLineIndex * lineHeight + lineHeight,
                            textarea.clientHeight
                        );
                        setCursorPosition({ top, left: 0 });
                    }
                    return;
                }
            }
        }
        setShowRefSuggestions(false);
    };

    const insertReference = (doc: DocumentRef) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const cursorPos = textarea.selectionStart;
        const textBeforeCursor = value.slice(0, cursorPos);
        const textAfterCursor = value.slice(cursorPos);
        const lastSlashIndex = textBeforeCursor.lastIndexOf("/");

        // Replace from the last slash to cursor with the full reference
        const beforeSlash = textBeforeCursor.slice(0, lastSlashIndex);
        const newValue = `${beforeSlash}/${doc.name} ${textAfterCursor}`;

        onChange(newValue);
        setShowRefSuggestions(false);

        // Restore focus and set cursor position after the inserted reference
        requestAnimationFrame(() => {
            textarea.focus();
            const newCursorPos = beforeSlash.length + doc.name.length + 2;
            textarea.setSelectionRange(newCursorPos, newCursorPos);
        });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showRefSuggestions) {
            if (e.key === "Enter" && filteredDocuments.length > 0) {
                e.preventDefault();
                insertReference(filteredDocuments[0]);
            } else if (e.key === "Escape") {
                setShowRefSuggestions(false);
            }
        }
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            setShowRefSuggestions(false);
            onBlur?.();
        }
    };

    const getDocumentIcon = (kind: DocumentRefKind): string => {
        switch (kind) {
            case "chapter":
                return "📖";
            case "scrapNote":
                return "📝";
            case "character":
                return "👤";
            case "location":
                return "📍";
            case "organization":
                return "🏛️";
            default:
                return "📄";
        }
    };

    return (
        <div
            ref={containerRef}
            className={classNames("textarea-input-wrapper", className)}
            onBlur={handleBlur}
        >
            <textarea
                ref={textareaRef}
                id={id}
                className="text-area textarea-input"
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={rows}
            />

            {/* Reference suggestions dropdown */}
            {showRefSuggestions && filteredDocuments.length > 0 && (
                <div
                    className="textarea-ref-dropdown"
                    style={
                        cursorPosition ? { top: cursorPosition.top } : undefined
                    }
                >
                    <div className="textarea-ref-header">Link to document</div>
                    {filteredDocuments.map((doc) => (
                        <button
                            key={doc.id}
                            type="button"
                            className="textarea-ref-item"
                            onClick={() => insertReference(doc)}
                        >
                            <span className="textarea-ref-icon">
                                {getDocumentIcon(doc.kind)}
                            </span>
                            <span className="textarea-ref-name">
                                {doc.name}
                            </span>
                            <span className="textarea-ref-kind">
                                {doc.kind}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
