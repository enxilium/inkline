import React from "react";
import { Button } from "../ui/Button";
import { ChevronRightIcon, SendIcon } from "../ui/Icons";
import { useAppStore } from "../../state/appStore";
import { ensureRendererApi } from "../../utils/api";

const rendererApi = ensureRendererApi();

type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
};

export const ChatPanel: React.FC = () => {
    const { projectId, toggleChat } = useAppStore();
    const [messages, setMessages] = React.useState<ChatMessage[]>([
        {
            id: "welcome",
            role: "assistant",
            content: "Hello! I'm your AI assistant. How can I help you with your story today?",
            timestamp: Date.now(),
        }
    ]);
    const [inputValue, setInputValue] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
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

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            content: inputValue,
            timestamp: Date.now(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue("");
        setIsLoading(true);

        try {
            // Use the existing generalChat API if available, or mock it
            const response = await rendererApi.analysis.generalChat({
                projectId,
                prompt: userMessage.content,
            });

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response.reply,
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: "Sorry, I encountered an error processing your request.",
                timestamp: Date.now(),
            };
            setMessages(prev => [...prev, errorMessage]);
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

    return (
        <aside className="chat-panel">
            <div className="binder-header">
                <div className="panel-label-container">
                    <p className="panel-label">AI CHAT</p>
                    <div className="panel-actions">
                        <Button variant="icon" onClick={toggleChat}>
                            <ChevronRightIcon />
                        </Button>
                    </div>
                </div>
            </div>
            
            <div className="chat-messages-container" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messages.map((msg) => (
                    <div 
                        key={msg.id} 
                        className={`chat-message ${msg.role}`}
                        style={{
                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            background: msg.role === 'user' ? 'var(--accent-transparent)' : 'rgba(255,255,255,0.05)',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            lineHeight: '1.4',
                            border: msg.role === 'user' ? '1px solid var(--accent-transparent2)' : '1px solid var(--stroke)',
                        }}
                    >
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    </div>
                ))}
                {isLoading && (
                    <div className="chat-message assistant" style={{ alignSelf: 'flex-start', padding: '0.75rem', fontSize: '0.85rem', fontStyle: 'italic', opacity: 0.7 }}>
                        Thinking...
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ height: '100px' }}>
                <div style={{ position: 'relative' }}>
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask something..."
                        className="chat-input"
                    />
                    <div style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem' }}>
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
