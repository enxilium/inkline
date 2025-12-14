import React from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { ToolbarButton } from "../ToolbarButton";
import { Input } from "../ui/Input";
import { useAppStore } from "../../state/appStore";
import {
    LinkIcon,
    UnlinkIcon,
    AlignLeftIcon,
    AlignCenterIcon,
    AlignRightIcon,
    AlignJustifyIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CloseIcon,
    RefreshCwIcon,
    PlusIcon,
} from "../ui/Icons";
import { LinkDialog } from "../dialogs/LinkDialog";
import type { AutosaveStatus } from "../../types";

interface TextEditorProps {
    editor: Editor | null;
    autosaveLabel?: string;
    autosaveClass?: string;
}

const fontOptions = [
    { label: "Body Default (Inter)", value: "" },
    { label: "Inter", value: "'InterVariable', 'Inter', sans-serif" },
    { label: "Roboto", value: "'Roboto', sans-serif" },
    { label: "Open Sans", value: "'Open Sans', sans-serif" },
    { label: "Lato", value: "'Lato', sans-serif" },
    { label: "Montserrat", value: "'Montserrat', sans-serif" },
    { label: "Source Sans 3", value: "'Source Sans 3', sans-serif" },
    { label: "Work Sans", value: "'Work Sans', sans-serif" },
    { label: "Nunito", value: "'Nunito', sans-serif" },
    { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
    { label: "Merriweather", value: "'Merriweather', serif" },
    { label: "Source Serif 4", value: "'Source Serif 4', serif" },
    { label: "Lora", value: "'Lora', serif" },
    { label: "Playfair Display", value: "'Playfair Display', serif" },
    { label: "Crimson Pro", value: "'Crimson Pro', serif" },
    { label: "Roboto Slab", value: "'Roboto Slab', serif" },
    { label: "IBM Plex Mono", value: "'IBM Plex Mono', monospace" },
];

export const TextEditor: React.FC<TextEditorProps> = ({
    editor,
    autosaveLabel,
    autosaveClass,
}) => {
    const stage = useAppStore((state) => state.stage);
    const [renderTick, setRenderTick] = React.useState(0);
    const [isLinkDialogOpen, setLinkDialogOpen] = React.useState(false);
    const [pendingLinkUrl, setPendingLinkUrl] = React.useState("");
    const [isFindOpen, setIsFindOpen] = React.useState(false);
    const [isReplaceOpen, setIsReplaceOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [replaceTerm, setReplaceTerm] = React.useState("");
    const [caseSensitive, setCaseSensitive] = React.useState(false);
    const findInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (!editor || stage !== "workspace") {
            return;
        }

        const rerender = () => setRenderTick((prev) => prev + 1);
        editor.on("selectionUpdate", rerender);
        editor.on("transaction", rerender);

        return () => {
            editor.off("selectionUpdate", rerender);
            editor.off("transaction", rerender);
        };
    }, [editor, stage]);

    React.useEffect(() => {
        if (!editor || stage !== "workspace") {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            // Ctrl+F is reserved for in-file Find/Replace ONLY in the workspace view.
            // Ignore titlebar shortcuts (global search input lives there).
            const target = event.target as HTMLElement | null;
            if (target?.closest("#titlebar")) {
                return;
            }

            const isMod = event.ctrlKey || event.metaKey;
            const key = event.key.toLowerCase();

            if (isMod && key === "f") {
                event.preventDefault();
                if (isFindOpen) {
                    setIsFindOpen(false);
                    setIsReplaceOpen(false);
                    editor.commands.setSearchTerm("");
                    return;
                }

                setIsFindOpen(true);
                return;
            }

            if (event.key === "Escape" && isFindOpen) {
                event.preventDefault();
                setIsFindOpen(false);
                setIsReplaceOpen(false);
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [editor, isFindOpen, stage]);

    React.useEffect(() => {
        if (stage !== "workspace") {
            setIsFindOpen(false);
            setIsReplaceOpen(false);
        }
    }, [stage]);

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        if (!isFindOpen) {
            editor.commands.setSearchTerm("");
            return;
        }

        // Focus the find field once when opening (do not re-select on every keystroke).
        requestAnimationFrame(() => {
            findInputRef.current?.focus();
            findInputRef.current?.select();
        });
    }, [editor, isFindOpen]);

    React.useEffect(() => {
        if (!editor || !isFindOpen) {
            return;
        }

        editor.commands.setSearchTerm(searchTerm);
    }, [editor, isFindOpen, searchTerm]);

    React.useEffect(() => {
        if (!editor || !isFindOpen) {
            return;
        }

        editor.commands.setReplaceTerm(replaceTerm);
    }, [editor, isFindOpen, replaceTerm]);

    React.useEffect(() => {
        if (!editor || !isFindOpen) {
            return;
        }

        editor.commands.setCaseSensitive(caseSensitive);
    }, [caseSensitive, editor, isFindOpen]);

    const hasAnyResults = React.useMemo(() => {
        return (editor?.storage.searchAndReplace.results.length ?? 0) > 0;
    }, [editor, renderTick]);

    const blockValue = React.useMemo(() => {
        if (!editor) {
            return "paragraph";
        }
        if (editor.isActive("heading", { level: 1 })) {
            return "h1";
        }
        if (editor.isActive("heading", { level: 2 })) {
            return "h2";
        }
        if (editor.isActive("heading", { level: 3 })) {
            return "h3";
        }
        return "paragraph";
    }, [editor, renderTick]); // renderTick dependency to trigger recalc

    const openLinkDialog = () => {
        if (!editor) {
            return;
        }
        const previousUrl = editor.getAttributes("link").href ?? "";
        setPendingLinkUrl(previousUrl);
        setLinkDialogOpen(true);
    };

    const handleLinkSubmit = (url: string) => {
        if (!editor) {
            return;
        }

        if (!url) {
            editor.chain().focus().unsetLink().run();
            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange("link")
            .setLink({ href: url })
            .run();
    };

    const clearFormatting = () => {
        editor?.chain().focus().unsetAllMarks().clearNodes().run();
    };

    return (
        <div className="text-editor-panel">
            {editor ? (
                <>
                    <div className="text-editor-container">
                        <div className="toolbar-card">
                            <select
                                className="toolbar-select"
                                aria-label="Font family"
                                value={
                                    editor.getAttributes("textStyle")
                                        .fontFamily ?? ""
                                }
                                onChange={(event) => {
                                    if (!editor) return;
                                    const { value } = event.target;
                                    if (!value) {
                                        editor
                                            .chain()
                                            .focus()
                                            .unsetFontFamily()
                                            .run();
                                        return;
                                    }
                                    editor
                                        .chain()
                                        .focus()
                                        .setFontFamily(value)
                                        .run();
                                }}
                            >
                                {fontOptions.map((font) => (
                                    <option key={font.label} value={font.value}>
                                        {font.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="toolbar-select"
                                aria-label="Text style"
                                value={blockValue}
                                onChange={(event) => {
                                    if (!editor) return;
                                    const value = event.target.value;
                                    const chain = editor.chain().focus();
                                    if (value === "paragraph") {
                                        chain.setParagraph().run();
                                        return;
                                    }
                                    const level = Number(value.substring(1)) as
                                        | 1
                                        | 2
                                        | 3;
                                    chain.setHeading({ level }).run();
                                }}
                            >
                                <option value="paragraph">Paragraph</option>
                                <option value="h1">Heading 1</option>
                                <option value="h2">Heading 2</option>
                                <option value="h3">Heading 3</option>
                            </select>
                            <div className="toolbar-divider" />
                            <ToolbarButton
                                label="B"
                                onClick={() =>
                                    editor.chain().focus().toggleBold().run()
                                }
                                isActive={editor.isActive("bold")}
                            />
                            <ToolbarButton
                                label="I"
                                onClick={() =>
                                    editor.chain().focus().toggleItalic().run()
                                }
                                isActive={editor.isActive("italic")}
                            />
                            <ToolbarButton
                                label="U"
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .toggleUnderline()
                                        .run()
                                }
                                isActive={editor.isActive("underline")}
                            />
                            <ToolbarButton
                                label="S"
                                onClick={() =>
                                    editor.chain().focus().toggleStrike().run()
                                }
                                isActive={editor.isActive("strike")}
                            />
                            <ToolbarButton
                                label="<>"
                                onClick={() =>
                                    editor.chain().focus().toggleCode().run()
                                }
                                isActive={editor.isActive("code")}
                            />
                            <div className="toolbar-divider" />
                            <ToolbarButton
                                label={<AlignLeftIcon size={16} />}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setTextAlign("left")
                                        .run()
                                }
                                isActive={editor.isActive({
                                    textAlign: "left",
                                })}
                            />
                            <ToolbarButton
                                label={<AlignCenterIcon size={16} />}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setTextAlign("center")
                                        .run()
                                }
                                isActive={editor.isActive({
                                    textAlign: "center",
                                })}
                            />
                            <ToolbarButton
                                label={<AlignRightIcon size={16} />}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setTextAlign("right")
                                        .run()
                                }
                                isActive={editor.isActive({
                                    textAlign: "right",
                                })}
                            />
                            <ToolbarButton
                                label={<AlignJustifyIcon size={16} />}
                                onClick={() =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setTextAlign("justify")
                                        .run()
                                }
                                isActive={editor.isActive({
                                    textAlign: "justify",
                                })}
                            />
                            <div className="toolbar-divider" />
                            <ToolbarButton
                                label={<LinkIcon size={16} />}
                                onClick={openLinkDialog}
                                isActive={editor.isActive("link")}
                            />
                            <ToolbarButton
                                label={<UnlinkIcon size={16} />}
                                onClick={() =>
                                    editor.chain().focus().unsetLink().run()
                                }
                                disabled={!editor.isActive("link")}
                            />
                            <input
                                type="color"
                                className="toolbar-color"
                                aria-label="Text color"
                                value={
                                    editor.getAttributes("textStyle").color ??
                                    "var(--text)"
                                }
                                onChange={(event) =>
                                    editor
                                        .chain()
                                        .focus()
                                        .setColor(event.target.value)
                                        .run()
                                }
                            />
                            <ToolbarButton
                                label="Clear"
                                onClick={clearFormatting}
                            />
                            {autosaveLabel && (
                                <>
                                    <div className="toolbar-divider" />
                                    <div
                                        className={`status-pill ${autosaveClass} autosave-status`}
                                    >
                                        {autosaveLabel}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="editor-surface">
                            {isFindOpen ? (
                                <div className="editor-find-sticky">
                                    <div
                                        className="editor-find-dropdown"
                                        onMouseDown={(event) => {
                                            // Prevent editor selection changes when clicking in the dropdown,
                                            // but still allow focusing/typing in inputs.
                                            const target =
                                                event.target as HTMLElement | null;
                                            if (
                                                target?.closest(
                                                    "input, textarea"
                                                )
                                            ) {
                                                return;
                                            }
                                            event.preventDefault();
                                        }}
                                    >
                                        <div className="editor-find-row">
                                            <Input
                                                ref={findInputRef}
                                                className="editor-find-input"
                                                placeholder="Find"
                                                value={searchTerm}
                                                onChange={(event) =>
                                                    setSearchTerm(
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <button
                                                type="button"
                                                className="btn btn-icon editor-find-btn"
                                                disabled={!hasAnyResults}
                                                onClick={() =>
                                                    editor.commands.selectPreviousResult()
                                                }
                                                title="Previous"
                                                aria-label="Previous"
                                            >
                                                <ChevronLeftIcon size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-icon editor-find-btn"
                                                disabled={!hasAnyResults}
                                                onClick={() =>
                                                    editor.commands.selectNextResult()
                                                }
                                                title="Next"
                                                aria-label="Next"
                                            >
                                                <ChevronRightIcon size={16} />
                                            </button>

                                            <button
                                                type="button"
                                                className={`btn btn-icon editor-find-btn ${caseSensitive ? "is-active" : ""}`}
                                                onClick={() =>
                                                    setCaseSensitive(
                                                        (prev) => !prev
                                                    )
                                                }
                                                title="Match case"
                                                aria-label="Match case"
                                            >
                                                <span className="editor-find-aa">
                                                    Aa
                                                </span>
                                            </button>

                                            <button
                                                type="button"
                                                className={`btn btn-icon editor-find-btn ${isReplaceOpen ? "is-active" : ""}`}
                                                onClick={() =>
                                                    setIsReplaceOpen(
                                                        (prev) => !prev
                                                    )
                                                }
                                                title="Replace"
                                                aria-label="Replace"
                                            >
                                                <ChevronDownIcon
                                                    size={16}
                                                    className={
                                                        isReplaceOpen
                                                            ? "editor-find-chevron is-open"
                                                            : "editor-find-chevron"
                                                    }
                                                />
                                            </button>

                                            <button
                                                type="button"
                                                className="btn btn-icon editor-find-btn"
                                                onClick={() => {
                                                    setIsFindOpen(false);
                                                    setIsReplaceOpen(false);
                                                    editor.commands.setSearchTerm(
                                                        ""
                                                    );
                                                }}
                                                title="Close"
                                                aria-label="Close"
                                            >
                                                <CloseIcon size={16} />
                                            </button>
                                        </div>

                                        {isReplaceOpen ? (
                                            <div className="editor-find-row">
                                                <Input
                                                    className="editor-find-input"
                                                    placeholder="Replace"
                                                    value={replaceTerm}
                                                    onChange={(event) =>
                                                        setReplaceTerm(
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    className="btn btn-icon editor-find-btn"
                                                    disabled={!hasAnyResults}
                                                    onClick={() =>
                                                        editor.commands.replace()
                                                    }
                                                    title="Replace"
                                                    aria-label="Replace"
                                                >
                                                    <RefreshCwIcon size={16} />
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-icon editor-find-btn"
                                                    disabled={!hasAnyResults}
                                                    onClick={() =>
                                                        editor.commands.replaceAll()
                                                    }
                                                    title="Replace all"
                                                    aria-label="Replace all"
                                                >
                                                    <span className="editor-find-icon-stack">
                                                        <RefreshCwIcon
                                                            size={16}
                                                        />
                                                        <PlusIcon
                                                            size={10}
                                                            className="editor-find-icon-stack-plus"
                                                        />
                                                    </span>
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ) : null}

                            <div className="editor-scroll">
                                <div className="editor-body">
                                    <EditorContent editor={editor} />
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <p className="binder-empty">
                    Editor is still starting. Sit tight.
                </p>
            )}
            <LinkDialog
                open={isLinkDialogOpen}
                initialUrl={pendingLinkUrl}
                onOpenChange={setLinkDialogOpen}
                onSubmit={handleLinkSubmit}
            />
        </div>
    );
};
