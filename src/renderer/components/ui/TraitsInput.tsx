import * as React from "react";
import classNames from "clsx";
import { CloseIcon } from "./Icons";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import SentimentSatisfiedIcon from "@mui/icons-material/SentimentSatisfied";
import HandshakeIcon from "@mui/icons-material/Handshake";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import ShieldIcon from "@mui/icons-material/Shield";
import BoltIcon from "@mui/icons-material/Bolt";
import FitnessCenterIcon from "@mui/icons-material/FitnessCenter";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PsychologyIcon from "@mui/icons-material/Psychology";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import PaletteIcon from "@mui/icons-material/Palette";
import SearchIcon from "@mui/icons-material/Search";
import BalanceIcon from "@mui/icons-material/Balance";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import SpaIcon from "@mui/icons-material/Spa";
import LocalFloristIcon from "@mui/icons-material/LocalFlorist";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatIcon from "@mui/icons-material/Chat";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import ExploreIcon from "@mui/icons-material/Explore";
import BuildIcon from "@mui/icons-material/Build";
import AssignmentIcon from "@mui/icons-material/Assignment";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Brightness3Icon from "@mui/icons-material/Brightness3";
import LockIcon from "@mui/icons-material/Lock";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VisibilityIcon from "@mui/icons-material/Visibility";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import ExtensionIcon from "@mui/icons-material/Extension";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import FlightIcon from "@mui/icons-material/Flight";
import LandscapeIcon from "@mui/icons-material/Landscape";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import DiamondIcon from "@mui/icons-material/Diamond";
import RepeatIcon from "@mui/icons-material/Repeat";
import SyncIcon from "@mui/icons-material/Sync";
import StarsIcon from "@mui/icons-material/Stars";
import FaceIcon from "@mui/icons-material/Face";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import HeartBrokenIcon from "@mui/icons-material/HeartBroken";
import DangerousIcon from "@mui/icons-material/Dangerous";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import MoodBadIcon from "@mui/icons-material/MoodBad";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import MoodIcon from "@mui/icons-material/Mood";
import CloudIcon from "@mui/icons-material/Cloud";
import SentimentVeryDissatisfiedIcon from "@mui/icons-material/SentimentVeryDissatisfied";
import CasinoIcon from "@mui/icons-material/Casino";
import AvTimerIcon from "@mui/icons-material/AvTimer";
import HotelIcon from "@mui/icons-material/Hotel";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import HealingIcon from "@mui/icons-material/Healing";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import FlagIcon from "@mui/icons-material/Flag";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import StraightenIcon from "@mui/icons-material/Straighten";

// ─────────────────────────────────────────────────────────────────────────────
// Trait Icon Mapping - Common character personality traits with MUI icons
// ─────────────────────────────────────────────────────────────────────────────

const TRAIT_ICONS: Record<string, React.ComponentType<unknown>> = {
    // Positive traits
    optimistic: WbSunnyIcon,
    hopeful: WbSunnyIcon,
    cheerful: SentimentSatisfiedIcon,
    friendly: HandshakeIcon,
    kind: FavoriteIcon,
    compassionate: FavoriteIcon,
    empathetic: FavoriteIcon,
    generous: CardGiftcardIcon,
    loyal: ShieldIcon,
    devoted: FavoriteIcon,
    faithful: ShieldIcon,
    brave: BoltIcon,
    courageous: BoltIcon,
    fearless: BoltIcon,
    bold: BoltIcon,
    confident: FitnessCenterIcon,
    determined: FitnessCenterIcon,
    ambitious: TrendingUpIcon,
    driven: TrendingUpIcon,
    intelligent: PsychologyIcon,
    clever: PsychologyIcon,
    wise: LightbulbIcon,
    creative: PaletteIcon,
    artistic: PaletteIcon,
    imaginative: PaletteIcon,
    curious: SearchIcon,
    inquisitive: SearchIcon,
    honest: BalanceIcon,
    sincere: BalanceIcon,
    humble: SpaIcon,
    patient: HourglassEmptyIcon,
    calm: SelfImprovementIcon,
    peaceful: SpaIcon,
    gentle: LocalFloristIcon,
    charming: AutoAwesomeIcon,
    charismatic: AutoAwesomeIcon,
    witty: ChatIcon,
    humorous: EmojiEmotionsIcon,
    playful: EmojiEmotionsIcon,
    adventurous: ExploreIcon,
    daring: ExploreIcon,
    resourceful: BuildIcon,
    practical: BuildIcon,
    reliable: ShieldIcon,
    dependable: ShieldIcon,
    responsible: ShieldIcon,
    disciplined: StraightenIcon,
    organized: AssignmentIcon,
    leader: EmojiEventsIcon,
    protective: ShieldIcon,

    // Neutral/Complex traits
    secretive: VisibilityOffIcon,
    mysterious: Brightness3Icon,
    enigmatic: Brightness3Icon,
    reserved: LockIcon,
    introverted: LockIcon,
    quiet: VolumeOffIcon,
    observant: VisibilityIcon,
    analytical: PsychologyIcon,
    logical: PsychologyIcon,
    stoic: HorizontalRuleIcon,
    serious: HorizontalRuleIcon,
    calculating: ExtensionIcon,
    strategic: ExtensionIcon,
    cunning: PsychologyIcon,
    sly: PsychologyIcon,
    pragmatic: SettingsIcon,
    skeptical: HelpOutlineIcon,
    cynical: HelpOutlineIcon,
    independent: FlightIcon,
    solitary: LandscapeIcon,
    aloof: AcUnitIcon,
    detached: AcUnitIcon,
    perfectionist: DiamondIcon,
    stubborn: RepeatIcon,
    headstrong: RepeatIcon,
    obsessive: SyncIcon,
    competitive: EmojiEventsIcon,
    proud: StarsIcon,

    // Darker traits
    narcissistic: FaceIcon,
    vain: FaceIcon,
    arrogant: FaceIcon,
    selfish: AttachMoneyIcon,
    greedy: AttachMoneyIcon,
    envious: HeartBrokenIcon,
    jealous: HeartBrokenIcon,
    vengeful: DangerousIcon,
    wrathful: WhatshotIcon,
    angry: MoodBadIcon,
    aggressive: BoltIcon,
    violent: BoltIcon,
    cruel: DarkModeIcon,
    sadistic: DarkModeIcon,
    manipulative: TheaterComedyIcon,
    deceptive: TheaterComedyIcon,
    deceitful: TheaterComedyIcon,
    treacherous: DangerousIcon,
    cowardly: DirectionsRunIcon,
    paranoid: VisibilityIcon,
    anxious: MoodIcon,
    fearful: MoodIcon,
    insecure: HeartBrokenIcon,
    pessimistic: CloudIcon,
    melancholic: CloudIcon,
    depressed: CloudIcon,
    bitter: SentimentVeryDissatisfiedIcon,
    resentful: SentimentVeryDissatisfiedIcon,
    reckless: CasinoIcon,
    impulsive: CasinoIcon,
    impatient: AvTimerIcon,
    lazy: HotelIcon,
    apathetic: RemoveCircleOutlineIcon,
    cold: AcUnitIcon,
    ruthless: DangerousIcon,
    merciless: DangerousIcon,

    // Role-based
    scholar: MenuBookIcon,
    healer: HealingIcon,
    warrior: BoltIcon,
    protector: ShieldIcon,
    trickster: TheaterComedyIcon,
    sage: MenuBookIcon,
    prophet: AutoAwesomeIcon,
    hunter: GpsFixedIcon,
    romantic: FavoriteIcon,
    dreamer: AutoStoriesIcon,
    rebel: FlagIcon,
    outcast: RemoveCircleOutlineIcon,
    survivor: LocalFireDepartmentIcon,
    noble: EmojiEventsIcon,
    devout: FavoriteBorderIcon,
    spiritual: Brightness3Icon,
    haunted: Brightness3Icon,
    cursed: Brightness3Icon,
};

function getTraitIcon(trait: string): React.ReactElement | null {
    const normalized = trait.toLowerCase().trim();
    const IconComponent = TRAIT_ICONS[normalized];
    if (!IconComponent) return null;
    return <IconComponent style={{ fontSize: 14 }} />;
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
            (t) => t.includes(query) && !value.includes(t),
        );
        const fromCustom = suggestions.filter(
            (s) => s.toLowerCase().includes(query) && !value.includes(s),
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
