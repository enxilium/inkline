import React, { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { useAppStore } from "../../state/appStore";
import { extractPlainText } from "../../utils/textStats";

interface DocumentSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    documentType: "chapter" | "scrap_note";
    onSelect: (document: {
        id: string;
        title: string;
        content: string;
    }) => void;
}

export const DocumentSearchDialog: React.FC<DocumentSearchDialogProps> = ({
    open,
    onOpenChange,
    documentType,
    onSelect,
}) => {
    const { chapters, scrapNotes } = useAppStore();
    const [searchQuery, setSearchQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset search when dialog opens
    useEffect(() => {
        if (open) {
            setSearchQuery("");
            // Focus input after a short delay to ensure dialog is rendered
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [open]);

    const documents = useMemo(() => {
        const source = documentType === "chapter" ? chapters : scrapNotes;
        return source.map((doc) => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
        }));
    }, [documentType, chapters, scrapNotes]);

    const filteredDocuments = useMemo(() => {
        if (!searchQuery.trim()) {
            return documents;
        }
        const query = searchQuery.toLowerCase();
        return documents.filter(
            (doc) =>
                doc.title.toLowerCase().includes(query) ||
                doc.content.toLowerCase().includes(query)
        );
    }, [documents, searchQuery]);

    const handleSelect = (doc: {
        id: string;
        title: string;
        content: string;
    }) => {
        onSelect(doc);
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && filteredDocuments.length > 0) {
            e.preventDefault();
            handleSelect(filteredDocuments[0]);
        } else if (e.key === "Escape") {
            onOpenChange(false);
        }
    };

    // Extract plain text from TipTap JSON content for preview
    const getPlainTextPreview = (content: string, maxLength = 120) => {
        const text = extractPlainText(content);
        if (text.length > maxLength) {
            return text.substring(0, maxLength).trim() + "...";
        }
        return text || "No content";
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                style={{
                    maxWidth: "500px",
                    maxHeight: "70vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <DialogHeader>
                    <DialogTitle>
                        Link{" "}
                        {documentType === "chapter" ? "Chapter" : "Scrap Note"}
                    </DialogTitle>
                </DialogHeader>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                        flex: 1,
                        minHeight: 0,
                    }}
                >
                    <Input
                        ref={inputRef}
                        type="text"
                        placeholder={`Search ${documentType === "chapter" ? "chapters" : "scrap notes"}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                            minHeight: "200px",
                            maxHeight: "400px",
                        }}
                    >
                        {filteredDocuments.length === 0 ? (
                            <div
                                style={{
                                    textAlign: "center",
                                    color: "var(--text-subtle)",
                                    padding: "2rem",
                                }}
                            >
                                {searchQuery
                                    ? "No matching documents found"
                                    : `No ${documentType === "chapter" ? "chapters" : "scrap notes"} available`}
                            </div>
                        ) : (
                            filteredDocuments.map((doc) => (
                                <button
                                    key={doc.id}
                                    onClick={() => handleSelect(doc)}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "flex-start",
                                        gap: "0.25rem",
                                        padding: "0.75rem",
                                        backgroundColor:
                                            "var(--surface-strong)",
                                        border: "1px solid var(--stroke)",
                                        borderRadius: "0.5rem",
                                        cursor: "pointer",
                                        textAlign: "left",
                                        transition: "all 0.15s ease",
                                        width: "100%",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "var(--accent-transparent)";
                                        e.currentTarget.style.borderColor =
                                            "var(--accent)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor =
                                            "var(--surface-strong)";
                                        e.currentTarget.style.borderColor =
                                            "var(--stroke)";
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "0.95rem",
                                            color: "var(--text)",
                                        }}
                                    >
                                        {doc.title || "Untitled"}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "0.8rem",
                                            color: "var(--text-subtle)",
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {getPlainTextPreview(doc.content)}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
