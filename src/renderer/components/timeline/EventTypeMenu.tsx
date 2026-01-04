import React from "react";
import { EventType } from "../../../@core/domain/entities/story/timeline/Event";

interface EventTypeMenuProps {
    isOpen: boolean;
    position: { x: number; y: number };
    onClose: () => void;
    onSelect: (type: EventType) => void;
}

// Icons for menu items
const ChapterIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
);

const NoteIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);

const EventIcon = () => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
    >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

export const EventTypeMenu: React.FC<EventTypeMenuProps> = ({
    isOpen,
    position,
    onClose,
    onSelect,
}) => {
    if (!isOpen) return null;

    const menuItems: {
        type: EventType;
        label: string;
        description: string;
        icon: React.ReactNode;
    }[] = [
        {
            type: "chapter",
            label: "Link Chapter",
            description: "Create event from existing chapter",
            icon: <ChapterIcon />,
        },
        {
            type: "scrap_note",
            label: "Link Scrap Note",
            description: "Create event from existing note",
            icon: <NoteIcon />,
        },
        {
            type: "event",
            label: "New Event",
            description: "Create a standalone event",
            icon: <EventIcon />,
        },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 199,
                }}
                onClick={onClose}
            />
            {/* Menu */}
            <div
                style={{
                    position: "fixed",
                    left: position.x,
                    top: position.y,
                    zIndex: 200,
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--stroke)",
                    borderRadius: "0.5rem",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
                    minWidth: "220px",
                    overflow: "hidden",
                    animation: "fadeInScale 0.15s ease-out",
                }}
            >
                <div
                    style={{
                        padding: "0.5rem 0.75rem",
                        borderBottom: "1px solid var(--stroke)",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.5)",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                    }}
                >
                    Add to Timeline
                </div>
                {menuItems.map((item) => (
                    <button
                        key={item.type}
                        onClick={() => {
                            onSelect(item.type);
                            onClose();
                        }}
                        style={{
                            width: "100%",
                            padding: "0.75rem",
                            textAlign: "left",
                            backgroundColor: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "inherit",
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "0.75rem",
                            transition: "background-color 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                                "rgba(255,255,255,0.05)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                                "transparent";
                        }}
                    >
                        <div
                            style={{
                                color: "var(--accent)",
                                marginTop: "2px",
                            }}
                        >
                            {item.icon}
                        </div>
                        <div>
                            <div
                                style={{ fontWeight: 500, marginBottom: "2px" }}
                            >
                                {item.label}
                            </div>
                            <div
                                style={{
                                    fontSize: "0.75rem",
                                    color: "rgba(255,255,255,0.5)",
                                }}
                            >
                                {item.description}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            <style>{`
                @keyframes fadeInScale {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
            `}</style>
        </>
    );
};
