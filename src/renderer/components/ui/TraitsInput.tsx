import * as React from "react";
import classNames from "clsx";
import { CloseIcon } from "./Icons";

// ─────────────────────────────────────────────────────────────────────────────
// Trait Icon Mapping - Common character personality traits with emoji icons
// ─────────────────────────────────────────────────────────────────────────────

const TRAIT_ICONS: Record<string, string> = {
    // Positive traits
    optimistic: "☀️",
    hopeful: "☀️",
    cheerful: "😊",
    friendly: "🤝",
    kind: "💗",
    compassionate: "💗",
    empathetic: "💗",
    generous: "🎁",
    loyal: "🛡️",
    devoted: "🛡️",
    faithful: "🛡️",
    brave: "⚔️",
    courageous: "⚔️",
    fearless: "⚔️",
    bold: "⚔️",
    confident: "💪",
    determined: "💪",
    ambitious: "🎯",
    driven: "🎯",
    intelligent: "🧠",
    clever: "🧠",
    wise: "🦉",
    creative: "🎨",
    artistic: "🎨",
    imaginative: "🎨",
    curious: "🔍",
    inquisitive: "🔍",
    honest: "⚖️",
    sincere: "⚖️",
    humble: "🌱",
    patient: "⏳",
    calm: "🧘",
    peaceful: "🕊️",
    gentle: "🌸",
    charming: "✨",
    charismatic: "✨",
    witty: "💬",
    humorous: "😄",
    playful: "🎭",
    adventurous: "🗺️",
    daring: "🗺️",
    resourceful: "🔧",
    practical: "🔧",
    reliable: "🏛️",
    dependable: "🏛️",
    responsible: "🏛️",
    disciplined: "📏",
    organized: "📋",
    leader: "👑",
    protective: "🛡️",

    // Neutral/Complex traits
    secretive: "🤫",
    mysterious: "🌙",
    enigmatic: "🌙",
    reserved: "🔒",
    introverted: "🔒",
    quiet: "🤐",
    observant: "👁️",
    analytical: "🔬",
    logical: "🔬",
    stoic: "🗿",
    serious: "😐",
    calculating: "♟️",
    strategic: "♟️",
    cunning: "🦊",
    sly: "🦊",
    pragmatic: "⚙️",
    skeptical: "🤨",
    cynical: "🤨",
    independent: "🦅",
    solitary: "🏔️",
    aloof: "❄️",
    detached: "❄️",
    perfectionist: "💎",
    stubborn: "🐂",
    headstrong: "🐂",
    obsessive: "🔄",
    competitive: "🏆",
    proud: "🦁",

    // Darker traits
    narcissistic: "🪞",
    vain: "🪞",
    arrogant: "👃",
    selfish: "💰",
    greedy: "💰",
    envious: "💚",
    jealous: "💚",
    vengeful: "🗡️",
    wrathful: "🔥",
    angry: "😠",
    aggressive: "👊",
    violent: "⚡",
    cruel: "🖤",
    sadistic: "🖤",
    manipulative: "🕷️",
    deceptive: "🎭",
    deceitful: "🎭",
    treacherous: "🐍",
    cowardly: "🐔",
    paranoid: "👀",
    anxious: "😰",
    fearful: "😨",
    insecure: "🥀",
    pessimistic: "🌧️",
    melancholic: "🌧️",
    depressed: "☁️",
    bitter: "🍋",
    resentful: "😤",
    reckless: "🎲",
    impulsive: "⚡",
    impatient: "⏰",
    lazy: "🦥",
    apathetic: "😶",
    cold: "🧊",
    ruthless: "💀",
    merciless: "💀",

    // Role-based
    scholar: "📚",
    healer: "💊",
    warrior: "⚔️",
    protector: "🛡️",
    trickster: "🃏",
    sage: "📜",
    prophet: "🔮",
    hunter: "🏹",
    romantic: "💕",
    dreamer: "💭",
    rebel: "🚩",
    outcast: "🌑",
    survivor: "🔥",
    noble: "👑",
    devout: "🙏",
    spiritual: "✝️",
    haunted: "👻",
    cursed: "⛓️",
};

function getTraitIcon(trait: string): string | null {
    const normalized = trait.toLowerCase().trim();
    return TRAIT_ICONS[normalized] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TraitsInput Component
// ─────────────────────────────────────────────────────────────────────────────

export interface TraitsInputProps {
    value: string[];
    onChange: (traits: string[]) => void;
    onBlur?: () => void;
    placeholder?: string;
    className?: string;
    suggestions?: string[];
}

export const TraitsInput: React.FC<TraitsInputProps> = ({
    value,
    onChange,
    onBlur,
    placeholder = "Add a trait...",
    className,
    suggestions = [],
}) => {
    const [inputValue, setInputValue] = React.useState("");
    const [showSuggestions, setShowSuggestions] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Filter suggestions based on input
    const filteredSuggestions = React.useMemo(() => {
        if (!inputValue.trim()) {
            // Show common traits when empty
            return Object.keys(TRAIT_ICONS)
                .filter((t) => !value.includes(t))
                .slice(0, 12);
        }
        const query = inputValue.toLowerCase();
        const fromIcons = Object.keys(TRAIT_ICONS).filter(
            (t) => t.includes(query) && !value.includes(t)
        );
        const fromCustom = suggestions.filter(
            (s) => s.toLowerCase().includes(query) && !value.includes(s)
        );
        return [...new Set([...fromIcons, ...fromCustom])].slice(0, 8);
    }, [inputValue, value, suggestions]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const newTrait = inputValue.trim();
            if (newTrait && !value.includes(newTrait)) {
                onChange([...value, newTrait]);
                setInputValue("");
            }
            setShowSuggestions(false);
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    const removeTrait = (traitToRemove: string) => {
        onChange(value.filter((trait) => trait !== traitToRemove));
    };

    const addTrait = (trait: string) => {
        if (!value.includes(trait)) {
            onChange([...value, trait]);
        }
        setInputValue("");
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const handleBlur = (e: React.FocusEvent) => {
        if (!containerRef.current?.contains(e.relatedTarget as Node)) {
            const newTrait = inputValue.trim();
            if (newTrait && !value.includes(newTrait)) {
                onChange([...value, newTrait]);
                setInputValue("");
            }
            setShowSuggestions(false);
            onBlur?.();
        }
    };

    const handleFocus = () => {
        setShowSuggestions(true);
    };

    return (
        <div
            ref={containerRef}
            className={classNames("traits-input-wrapper", className)}
            onBlur={handleBlur}
        >
            <div className="traits-input-container">
                {value.map((trait) => {
                    const icon = getTraitIcon(trait);
                    return (
                        <span key={trait} className="trait-chip">
                            {icon && <span className="trait-icon">{icon}</span>}
                            <span className="trait-label">{trait}</span>
                            <button
                                type="button"
                                className="tag-remove-btn"
                                onClick={() => removeTrait(trait)}
                            >
                                <CloseIcon size={12} />
                            </button>
                        </span>
                    );
                })}
                <input
                    ref={inputRef}
                    type="text"
                    className="traits-input-field"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onKeyDown={handleKeyDown}
                    onFocus={handleFocus}
                    placeholder={value.length === 0 ? placeholder : ""}
                />
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="traits-suggestions-dropdown">
                    {filteredSuggestions.map((suggestion) => {
                        const icon = getTraitIcon(suggestion);
                        return (
                            <button
                                key={suggestion}
                                type="button"
                                className="traits-suggestion-item"
                                onClick={() => addTrait(suggestion)}
                            >
                                {icon && (
                                    <span className="trait-icon">{icon}</span>
                                )}
                                <span className="trait-label">
                                    {suggestion}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export { TRAIT_ICONS, getTraitIcon };
