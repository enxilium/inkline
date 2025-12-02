import React from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import { ToolbarButton } from "../ToolbarButton";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { LinkIcon, UnlinkIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon } from "../ui/Icons";
import { LinkDialog } from "../dialogs/LinkDialog";
import type { AutosaveStatus } from "../../types";

interface TextEditorProps {
    editor: Editor | null;
    title: string;
    isTitleSaving: boolean;
    autosaveStatus: AutosaveStatus;
    autosaveLabel: string;
    autosaveClass: string;
    onTitleChange: (value: string) => void;
    onTitleBlur: () => void;
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
    title,
    isTitleSaving,
    autosaveStatus,
    autosaveLabel,
    autosaveClass,
    onTitleChange,
    onTitleBlur,
}) => {
    const [, forceUpdate] = React.useState(0);
    const [isLinkDialogOpen, setLinkDialogOpen] = React.useState(false);
    const [pendingLinkUrl, setPendingLinkUrl] = React.useState("");

    React.useEffect(() => {
        if (!editor) {
            return;
        }

        const rerender = () => forceUpdate((prev) => prev + 1);
        editor.on("selectionUpdate", rerender);
        editor.on("transaction", rerender);

        return () => {
            editor.off("selectionUpdate", rerender);
            editor.off("transaction", rerender);
        };
    }, [editor]);

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
    }, [editor, forceUpdate]); // forceUpdate dependency to trigger recalc

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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="text-editor-panel">
                    <div className="text-editor-header">
                        <div className="text-title-field">
                            <Label htmlFor="text-doc-title">Title</Label>
                            <Input
                                id="text-doc-title"
                                value={title}
                                onChange={(event) => onTitleChange(event.target.value)}
                                onBlur={onTitleBlur}
                                disabled={isTitleSaving}
                            />
                        </div>
                        <div className={`autosave-status status-pill ${autosaveClass}`}>
                            {autosaveLabel}
                        </div>
                    </div>
                    {editor ? (
                        <>
                            <div className="toolbar-card">
                                <select
                                    className="toolbar-select"
                                    aria-label="Font family"
                                    value={editor.getAttributes("textStyle").fontFamily ?? ""}
                                    onChange={(event) => {
                                        if (!editor) return;
                                        const { value } = event.target;
                                        if (!value) {
                                            editor.chain().focus().unsetFontFamily().run();
                                            return;
                                        }
                                        editor.chain().focus().setFontFamily(value).run();
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
                                        const level = Number(value.substring(1)) as 1 | 2 | 3;
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
                                    onClick={() => editor.chain().focus().toggleBold().run()}
                                    isActive={editor.isActive("bold")}
                                />
                                <ToolbarButton
                                    label="I"
                                    onClick={() => editor.chain().focus().toggleItalic().run()}
                                    isActive={editor.isActive("italic")}
                                />
                                <ToolbarButton
                                    label="U"
                                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                                    isActive={editor.isActive("underline")}
                                />
                                <ToolbarButton
                                    label="S"
                                    onClick={() => editor.chain().focus().toggleStrike().run()}
                                    isActive={editor.isActive("strike")}
                                />
                                <ToolbarButton
                                    label="<>"
                                    onClick={() => editor.chain().focus().toggleCode().run()}
                                    isActive={editor.isActive("code")}
                                />
                                <div className="toolbar-divider" />
                                <ToolbarButton
                                    label={<AlignLeftIcon size={16} />}
                                    onClick={() => editor.chain().focus().setTextAlign("left").run()}
                                    isActive={editor.isActive({ textAlign: "left" })}
                                />
                                <ToolbarButton
                                    label={<AlignCenterIcon size={16} />}
                                    onClick={() => editor.chain().focus().setTextAlign("center").run()}
                                    isActive={editor.isActive({ textAlign: "center" })}
                                />
                                <ToolbarButton
                                    label={<AlignRightIcon size={16} />}
                                    onClick={() => editor.chain().focus().setTextAlign("right").run()}
                                    isActive={editor.isActive({ textAlign: "right" })}
                                />
                                <ToolbarButton
                                    label={<AlignJustifyIcon size={16} />}
                                    onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                                    isActive={editor.isActive({ textAlign: "justify" })}
                                />
                                <div className="toolbar-divider" />
                                <ToolbarButton
                                    label={<LinkIcon size={16} />}
                                    onClick={openLinkDialog}
                                    isActive={editor.isActive("link")}
                                />
                                <ToolbarButton
                                    label={<UnlinkIcon size={16} />}
                                    onClick={() => editor.chain().focus().unsetLink().run()}
                                    disabled={!editor.isActive("link")}
                                />
                                <input
                                    type="color"
                                    className="toolbar-color"
                                    aria-label="Text color"
                                    value={editor.getAttributes("textStyle").color ?? "var(--text)"}
                                    onChange={(event) =>
                                        editor.chain().focus().setColor(event.target.value).run()
                                    }
                                />
                                <ToolbarButton
                                    label="Clear"
                                    onClick={clearFormatting}
                                />
                            </div>
                            <div className="editor-surface">
                                <div className="editor-textarea">
                                    <EditorContent editor={editor} />
                                </div>
                                <div className="footer-hint">
                                    <span>Ctrl + B</span>
                                    <span>Ctrl + I</span>
                                    <span>Ctrl + K</span>
                                    <span>Cmd + Shift + P for palette</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="binder-empty">Editor is still starting. Sit tight.</p>
                    )}
                    <LinkDialog
                        open={isLinkDialogOpen}
                        initialUrl={pendingLinkUrl}
                        onOpenChange={setLinkDialogOpen}
                        onSubmit={handleLinkSubmit}
                    />
                </div>
            </div>
        </div>
    );
};