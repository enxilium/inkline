import React from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "../ui/Button";
import {
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
                return <span className="chat-txt-badge">TXT</span>;
            default:
                return null;
        }
    };

    return (
        <aside
            className="chat-panel"
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
                <div className="chat-history-overlay">
                    <h3 className="chat-history-title">
                        Previous Chats
                    </h3>
                    <div className="chat-history-list">
                        {historyList.length === 0 ? (
                            <p className="chat-history-empty">
                                No history found.
                            </p>
                        ) : (
                            historyList.map((chat) => (
                                <button
                                    key={chat.id}
                                    onClick={() =>
                                        handleSelectConversation(chat.id)
                                    }
                                    className="chat-history-item"
                                >
                                    <span className="chat-history-item-title">
                                        {chat.title || "Untitled Chat"}
                                    </span>
                                    <span className="chat-history-item-date">
                                        {chat.updatedAt.toLocaleDateString()}{" "}
                                        {chat.updatedAt.toLocaleTimeString()}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            <div className="chat-messages binder-scroll-area">
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`chat-message ${msg.role}`}
                    >
                        {msg.context && msg.context.length > 0 && (
                            <div className="chat-message-contexts">
                                {msg.context.map((ctx) => (
                                    <div
                                        key={ctx.id}
                                        className="chat-message-context"
                                    >
                                        {getIconForKind(ctx.type)}
                                        <span className="chat-message-context-title">
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
                    <div className="chat-message-thinking">
                        Thinking...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-composer">
                {/* Context Area */}
                {(attachedContexts.length > 0 || currentSelection) && (
                    <div className="chat-composer-contexts">
                        {attachedContexts.map((ctx) => (
                            <div
                                key={ctx.id}
                                className="chat-composer-chip"
                            >
                                {getIconForKind(ctx.type)}
                                <span className="chat-composer-chip-title">
                                    {ctx.title}
                                </span>
                                <button
                                    onClick={() => removeContext(ctx.id)}
                                    className="chat-composer-chip-remove"
                                >
                                    <CloseIcon size={10} />
                                </button>
                            </div>
                        ))}
                        {currentSelection && (
                            <div className="chat-composer-chip is-selection">
                                <span className="chat-txt-badge">TXT</span>
                                <span className="chat-composer-chip-title is-selection">
                                    {currentSelection.range}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="chat-input-wrap">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask something..."
                        className="chat-input"
                    />
                    <div className="chat-send-wrap">
                        <Button
                            variant="icon"
                            onClick={handleSendMessage}
                            disabled={!inputValue.trim() || isLoading}
                            className={
                                "chat-send-button" +
                                (!inputValue.trim() ? " is-dimmed" : "")
                            }
                        >
                            <SendIcon size={16} />
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
};
