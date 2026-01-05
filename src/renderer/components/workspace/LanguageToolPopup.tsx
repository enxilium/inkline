import React from "react";
import { Editor } from "@tiptap/react";
import { Match, LanguageToolStorage } from "../../tiptap/languageTool";

interface LanguageToolPopupProps {
    editor: Editor;
}

export const LanguageToolPopup: React.FC<LanguageToolPopupProps> = ({
    editor,
}) => {
    const [match, setMatch] = React.useState<Match | null>(null);
    const [matchRange, setMatchRange] = React.useState<{
        from: number;
        to: number;
    } | null>(null);
    const [position, setPosition] = React.useState<{
        top: number;
        left: number;
    } | null>(null);

    // Use a ref to track the last known match to detect changes
    const lastMatchRef = React.useRef<string | null>(null);
    // Track the document size to detect document switches
    const lastDocSizeRef = React.useRef<number>(0);

    // Clear state when editor changes or document content is replaced
    React.useEffect(() => {
        if (!editor) return;

        // Reset all state when editor instance changes
        setMatch(null);
        setMatchRange(null);
        setPosition(null);
        lastMatchRef.current = null;
        lastDocSizeRef.current = editor.state.doc.content.size;

        // Also reset the extension storage to avoid stale data
        editor.commands.resetLanguageToolMatch();
    }, [editor]);

    // Poll storage regularly to detect changes (more reliable than transaction-based)
    React.useEffect(() => {
        if (!editor) return;

        const checkStorage = () => {
            const storage = (
                editor.extensionStorage as unknown as Record<
                    string,
                    LanguageToolStorage
                >
            )?.languagetool;
            if (!storage) return;

            const currentDocSize = editor.state.doc.content.size;

            // Detect document switch (significant size change indicates new document)
            // Clear popup if document changed significantly
            if (Math.abs(currentDocSize - lastDocSizeRef.current) > 50) {
                lastDocSizeRef.current = currentDocSize;
                lastMatchRef.current = null;
                setMatch(null);
                setMatchRange(null);
                setPosition(null);
                return;
            }
            lastDocSizeRef.current = currentDocSize;

            const currentMatch = storage.match;
            const currentRange = storage.matchRange;

            // Validate that the range is within document bounds
            if (
                currentRange &&
                (currentRange.from < 0 || currentRange.to > currentDocSize)
            ) {
                // Invalid range - clear the popup
                setMatch(null);
                setMatchRange(null);
                setPosition(null);
                lastMatchRef.current = null;
                return;
            }

            // Create a unique key for the current match to compare
            const matchKey =
                currentMatch && currentRange
                    ? `${currentRange.from}-${currentRange.to}-${currentMatch.message}`
                    : null;

            if (matchKey !== lastMatchRef.current) {
                lastMatchRef.current = matchKey;

                if (currentMatch && currentRange) {
                    setMatch(currentMatch);
                    setMatchRange(currentRange);

                    // Calculate position
                    try {
                        // Double-check range is valid before calling coordsAtPos
                        if (
                            currentRange.from >= currentDocSize ||
                            currentRange.from < 0
                        ) {
                            setPosition(null);
                            return;
                        }

                        // coordsAtPos returns viewport coordinates
                        const coords = editor.view.coordsAtPos(
                            currentRange.from
                        );

                        // The popup is positioned inside .editor-body which has position: relative
                        // We need to find .editor-body and get its bounding rect
                        const editorDom = editor.view.dom;
                        const editorBody = editorDom.closest(".editor-body");

                        if (!editorBody) {
                            setPosition(null);
                            return;
                        }

                        const bodyRect = editorBody.getBoundingClientRect();

                        // Calculate position relative to the editor-body container
                        // Since the popup is inside the scrollable area, it will scroll with content
                        // No need to add scrollTop - the popup moves with the content
                        const relativeTop = coords.bottom - bodyRect.top;
                        const relativeLeft = coords.left - bodyRect.left;

                        // Sanity check: position should be reasonable
                        if (relativeTop < -50 || relativeTop > 10000) {
                            // Invalid position - don't show popup
                            setPosition(null);
                            return;
                        }

                        setPosition({
                            top: relativeTop + 8,
                            left: Math.max(
                                0,
                                Math.min(relativeLeft, bodyRect.width - 320)
                            ),
                        });
                    } catch {
                        setPosition(null);
                    }
                } else {
                    setMatch(null);
                    setMatchRange(null);
                    setPosition(null);
                }
            }
        };

        // Check immediately
        checkStorage();

        // Poll every 100ms for changes (handles edge cases where transactions don't fire)
        const interval = setInterval(checkStorage, 100);

        // Also check on transactions for faster response
        editor.on("transaction", checkStorage);

        return () => {
            clearInterval(interval);
            editor.off("transaction", checkStorage);
        };
    }, [editor]);

    // Close popup when clicking outside
    React.useEffect(() => {
        if (!match) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Don't close if clicking on the popup or a decorated element
            if (target.closest(".lt-popup") || target.closest(".lt")) {
                return;
            }

            handleDismiss();
        };

        // Small delay to prevent immediate close
        const timer = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside);
        }, 50);

        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [match]);

    const handleReplace = (replacement: string) => {
        if (!matchRange || !editor) return;

        editor
            .chain()
            .focus()
            .setTextSelection(matchRange)
            .deleteSelection()
            .insertContent(replacement)
            .run();

        handleDismiss();
    };

    const handleIgnore = () => {
        if (!editor) return;

        if (matchRange) {
            editor.chain().focus().setTextSelection(matchRange).run();
        }

        try {
            editor.commands.ignoreLanguageToolSuggestion();
        } catch {
            // Ignore errors if documentId isn't set
        }

        handleDismiss();
    };

    const handleDismiss = () => {
        if (editor) {
            editor.commands.resetLanguageToolMatch();
        }
        setMatch(null);
        setMatchRange(null);
        setPosition(null);
        lastMatchRef.current = null;
    };

    if (!match || !position) {
        return null;
    }

    return (
        <div
            className="lt-popup"
            style={{
                position: "absolute",
                top: position.top,
                left: position.left,
                zIndex: 1000,
            }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="lt-popup-message">{match.message}</div>

            {match.replacements && match.replacements.length > 0 && (
                <div className="lt-popup-suggestions">
                    {match.replacements
                        .slice(0, 5)
                        .map((replacement, index) => (
                            <button
                                key={index}
                                className="lt-popup-suggestion"
                                onClick={() => handleReplace(replacement.value)}
                                type="button"
                            >
                                {replacement.value || "(remove)"}
                            </button>
                        ))}
                </div>
            )}

            <div className="lt-popup-actions">
                <button
                    className="lt-popup-ignore"
                    onClick={handleIgnore}
                    type="button"
                >
                    Ignore
                </button>
                <button
                    className="lt-popup-ignore"
                    onClick={handleDismiss}
                    type="button"
                >
                    Dismiss
                </button>
            </div>
        </div>
    );
};
