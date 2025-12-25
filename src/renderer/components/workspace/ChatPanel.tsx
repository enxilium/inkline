import React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../ui/Button";
import {
    ChevronRightIcon,
    SendIcon,
    BinderChapterIcon,
    BinderScrapNoteIcon,
    PersonIcon,
    MapIcon,
    BinderOrganizationIcon,
    CloseIcon,
    HistoryIcon,
    PlusIcon,
} from "../ui/Icons";
import { useAppStore } from "../../state/appStore";
import type { WorkspaceDocumentKind } from "../../types";

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    context?: ContextItem[];
};

type ContextItem = {
    type: WorkspaceDocumentKind | "text";
    id: string;
    title: string;
    content?: string;
};

type ChatHistoryItem = {
    id: string;
    title: string | null;
    updatedAt: Date;
};

export const ChatPanel: React.FC = () => {
    const {
        projectId,
        toggleChat,
        generalChat,
        currentSelection,
        loadChatHistory,
        loadChatMessages,
    } = useAppStore();
    const [messages, setMessages] = React.useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content:
                "Hello! I'm your AI assistant. How can I help you with your story today?",
            timestamp: Date.now(),
        },
    ]);
    const [inputValue, setInputValue] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [conversationId, setConversationId] = React.useState<
        string | undefined
    >(undefined);
    const [attachedContexts, setAttachedContexts] = React.useState<
        ContextItem[]
    >([]);
    const [showHistory, setShowHistory] = React.useState(false);
    const [historyList, setHistoryList] = React.useState<ChatHistoryItem[]>([]);

    const messagesEndRef = React.useRef<HTMLDivElement>(null);
    const isFirstRender = React.useRef(true);

    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    React.useEffect(() => {
        if (isFirstRender.current) {
            scrollToBottom("auto");
            isFirstRender.current = false;
        } else {
            scrollToBottom("smooth");
        }
    }, [messages]);

    const handleLoadHistory = async () => {
        if (!showHistory) {
            try {
                const result = await loadChatHistory({ projectId });
                setHistoryList(
                    result.conversations.map((c) => ({
                        ...c,
                        updatedAt: new Date(c.updatedAt),
                    }))
                );
            } catch (error) {
                console.error("Failed to load chat history", error);
            }
        }
        setShowHistory(!showHistory);
    };

    const handleSelectConversation = async (id: string) => {
        try {
            setIsLoading(true);
            const result = await loadChatMessages({ conversationId: id });
            setMessages(
                result.messages.map((m) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    timestamp: m.timestamp,
                }))
            );
            setConversationId(id);
            setShowHistory(false);
        } catch (error) {
            console.error("Failed to load conversation", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setMessages([
            {
                id: "welcome",
                role: "assistant",
                content:
                    "Hello! I'm your AI assistant. How can I help you with your story today?",
                timestamp: Date.now(),
            },
        ]);
        setConversationId(undefined);
        setAttachedContexts([]);
        setShowHistory(false);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        // Prepare context documents
        const contextDocuments = [...attachedContexts];
        if (currentSelection) {
            contextDocuments.push({
                type: "text",
                id: currentSelection.range,
                title: currentSelection.range,
                content: currentSelection.text,
            });
        }

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue,
            timestamp: Date.now(),
            context: contextDocuments.length > 0 ? contextDocuments : undefined,
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);
        setAttachedContexts([]); // Clear attached contexts immediately

        try {
            const response = await generalChat({
                projectId,
                prompt: userMessage.content,
                conversationId,
                contextDocuments: contextDocuments.map((c) => ({
                    type: c.type,
                    id: c.id,
                    content: c.content,
                })),
            });

            if (response.conversationId) {
                setConversationId(response.conversationId);
            }

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response.reply,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content:
                    "Sorry, I encountered an error processing your request.",
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const data = e.dataTransfer.getData(
            "application/x-inkline-document-ref"
        );
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (attachedContexts.some((c) => c.id === parsed.id)) return;

                setAttachedContexts((prev) => [
                    ...prev,
                    {
                        type: parsed.kind,
                        id: parsed.id,
                        title: parsed.title,
                    },
                ]);
            } catch (err) {
                console.error("Failed to parse drop data", err);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    };

    const removeContext = (id: string) => {
        setAttachedContexts((prev) => prev.filter((c) => c.id !== id));
    };

    const getIconForKind = (kind: string) => {
        switch (kind) {
            case "chapter":
                return <BinderChapterIcon size={12} />;
            case "scrapNote":
                return <BinderScrapNoteIcon size={12} />;
            case "character":
                return <PersonIcon size={12} />;
            case "location":
                return <MapIcon size={12} />;
            case "organization":
                return <BinderOrganizationIcon size={12} />;
            case "text":
                return <span style={{ fontSize: "10px" }}>TXT</span>;
            default:
                return null;
        }
    };

    return (
        <aside
            className="binder-panel chat-panel-override"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
        >
            <div className="binder-header">
                <div className="panel-label-container">
                    <p className="panel-label">ASSISTANT</p>
                    <div className="panel-actions">
                        <Button
                            variant="icon"
                            onClick={handleLoadHistory}
                            title="History"
                        >
                            <HistoryIcon size={14} />
                        </Button>
                        <Button
                            variant="icon"
                            onClick={handleNewChat}
                            title="New Chat"
                        >
                            <PlusIcon size={14} />
                        </Button>
                        <Button variant="icon" onClick={toggleChat}>
                            <CloseIcon />
                        </Button>
                    </div>
                </div>
            </div>

            {showHistory && (
                <div
                    style={{
                        position: "absolute",
                        top: "36px",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "var(--surface)",
                        zIndex: 10,
                        padding: "1rem",
                        overflowY: "auto",
                    }}
                >
                    <h3
                        style={{
                            marginTop: 0,
                            marginBottom: "1rem",
                            fontSize: "0.9rem",
                            color: "var(--text-subtle)",
                        }}
                    >
                        Previous Chats
                    </h3>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.5rem",
                        }}
                    >
                        {historyList.length === 0 ? (
                            <p
                                style={{
                                    fontSize: "0.85rem",
                                    color: "var(--text-subtle)",
                                    fontStyle: "italic",
                                }}
                            >
                                No history found.
                            </p>
                        ) : (
                            historyList.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() =>
                                        handleSelectConversation(chat.id)
                                    }
                                    style={{
                                        background: "var(--surface-strong)",
                                        border: "1px solid var(--stroke)",
                                        padding: "0.75rem",
                                        borderRadius: "8px",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        color: "var(--text)",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "4px",
                                    }}
                                >
                                    <span
                                        style={{
                                            fontWeight: 500,
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        {chat.title || "Untitled Chat"}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-subtle)",
                                        }}
                                    >
                                        {chat.updatedAt.toLocaleDateString()}{" "}
                                        {chat.updatedAt.toLocaleTimeString()}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div
                className="binder-sections binder-scroll-area"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                }}
            >
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`chat-message ${msg.role}`}
                        style={{
                            alignSelf:
                                msg.role === "user" ? "flex-end" : "flex-start",
                            maxWidth: "85%",
                            background:
                                msg.role === "user"
                                    ? "var(--accent-transparent)"
                                    : "rgba(255,255,255,0.05)",
                            padding: "0.5rem 0.75rem",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                            lineHeight: "1.5",
                            border:
                                msg.role === "user"
                                    ? "1px solid var(--accent-transparent2)"
                                    : "1px solid var(--stroke)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                        }}
                    >
                        {msg.context && msg.context.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "4px",
                                    marginBottom: "2px",
                                    paddingBottom: "4px",
                                    borderBottom:
                                        "1px solid rgba(255,255,255,0.1)",
                                }}
                            >
                                {msg.context.map((ctx) => (
                                    <div
                                        key={ctx.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            background: "rgba(0,0,0,0.2)",
                                            borderRadius: "4px",
                                            padding: "2px 6px",
                                            fontSize: "0.75rem",
                                            color: "var(--text-secondary)",
                                        }}
                                    >
                                        {getIconForKind(ctx.type)}
                                        <span
                                            style={{
                                                maxWidth: "100px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {ctx.title}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="markdown-content">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div
                        className="chat-message assistant"
                        style={{
                            alignSelf: "flex-start",
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.85rem",
                            fontStyle: "italic",
                            opacity: 0.7,
                        }}
                    >
                        Thinking...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div
                style={{
                    padding: "0.5rem",
                    borderTop: "1px solid var(--stroke)",
                }}
            >
                {/* Context Area */}
                {(attachedContexts.length > 0 || currentSelection) && (
                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "4px",
                            marginBottom: "8px",
                        }}
                    >
                        {attachedContexts.map((ctx) => (
                            <div
                                key={ctx.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "var(--surface-strong)",
                                    border: "1px solid var(--stroke)",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    fontSize: "0.75rem",
                                    color: "var(--text-subtle)",
                                }}
                            >
                                {getIconForKind(ctx.type)}
                                <span
                                    style={{
                                        maxWidth: "100px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {ctx.title}
                                </span>
                                <button
                                    onClick={() => removeContext(ctx.id)}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        display: "flex",
                                        color: "inherit",
                                    }}
                                >
                                    <CloseIcon size={10} />
                                </button>
                            </div>
                        ))}
                        {currentSelection && (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    background: "var(--accent-transparent)",
                                    border: "1px solid var(--accent-transparent2)",
                                    borderRadius: "4px",
                                    padding: "2px 6px",
                                    fontSize: "0.75rem",
                                    color: "var(--accent)",
                                }}
                            >
                                <span style={{ fontSize: "10px" }}>TXT</span>
                                <span
                                    style={{
                                        maxWidth: "120px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {currentSelection.range}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ position: "relative" }}>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask something..."
                        className="chat-input"
                        style={{
                            width: "100%",
                            minHeight: "60px",
                            padding: "8px",
                            paddingRight: "32px",
                            background: "var(--surface-strong)",
                            border: "1px solid var(--stroke)",
                            borderRadius: "6px",
                            color: "var(--text)",
                            fontSize: "0.9rem",
                            resize: "vertical",
                            fontFamily: "inherit",
                        }}
                    />
                    <div
                        style={{
                            position: "absolute",
                            bottom: "0.5rem",
                            right: "0.5rem",
                        }}
                    >
                        <Button
                            variant="icon"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            style={{ opacity: inputValue.trim() ? 1 : 0.5 }}
                        >
                            <SendIcon size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
