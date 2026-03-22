import React from "react";
import type { SvgIconComponent } from "@mui/icons-material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import StarIcon from "@mui/icons-material/Star";
import FavoriteIcon from "@mui/icons-material/Favorite";
import BoltIcon from "@mui/icons-material/Bolt";
import WhatshotIcon from "@mui/icons-material/Whatshot";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import ShieldIcon from "@mui/icons-material/Shield";
import SecurityIcon from "@mui/icons-material/Security";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import AcUnitIcon from "@mui/icons-material/AcUnit";
import AirIcon from "@mui/icons-material/Air";
import ThunderstormIcon from "@mui/icons-material/Thunderstorm";
import PublicIcon from "@mui/icons-material/Public";
import ForestIcon from "@mui/icons-material/Forest";
import PetsIcon from "@mui/icons-material/Pets";
import BugReportIcon from "@mui/icons-material/BugReport";
import PsychologyIcon from "@mui/icons-material/Psychology";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import BuildIcon from "@mui/icons-material/Build";
import ConstructionIcon from "@mui/icons-material/Construction";
import HandymanIcon from "@mui/icons-material/Handyman";
import ScienceIcon from "@mui/icons-material/Science";
import BiotechIcon from "@mui/icons-material/Biotech";
import HealingIcon from "@mui/icons-material/Healing";
import LocalHospitalIcon from "@mui/icons-material/LocalHospital";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import SpaIcon from "@mui/icons-material/Spa";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ColorLensIcon from "@mui/icons-material/ColorLens";
import PaletteIcon from "@mui/icons-material/Palette";
import BrushIcon from "@mui/icons-material/Brush";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import PhotoIcon from "@mui/icons-material/Photo";
import ImageIcon from "@mui/icons-material/Image";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";
import HeadphonesIcon from "@mui/icons-material/Headphones";
import MicIcon from "@mui/icons-material/Mic";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import BusinessIcon from "@mui/icons-material/Business";
import WorkIcon from "@mui/icons-material/Work";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import GavelIcon from "@mui/icons-material/Gavel";
import GroupsIcon from "@mui/icons-material/Groups";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import FaceIcon from "@mui/icons-material/Face";
import BadgeIcon from "@mui/icons-material/Badge";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import SchoolIcon from "@mui/icons-material/School";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import TravelExploreIcon from "@mui/icons-material/TravelExplore";
import ExploreIcon from "@mui/icons-material/Explore";
import MapIcon from "@mui/icons-material/Map";
import PlaceIcon from "@mui/icons-material/Place";
import HomeIcon from "@mui/icons-material/Home";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import TerrainIcon from "@mui/icons-material/Terrain";
import FlightIcon from "@mui/icons-material/Flight";
import DirectionsBoatIcon from "@mui/icons-material/DirectionsBoat";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import TrainIcon from "@mui/icons-material/Train";
import TwoWheelerIcon from "@mui/icons-material/TwoWheeler";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocalCafeIcon from "@mui/icons-material/LocalCafe";
import LocalBarIcon from "@mui/icons-material/LocalBar";
import LocalLibraryIcon from "@mui/icons-material/LocalLibrary";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import KeyIcon from "@mui/icons-material/Key";
import TerminalIcon from "@mui/icons-material/Terminal";
import CodeIcon from "@mui/icons-material/Code";
import DataObjectIcon from "@mui/icons-material/DataObject";
import HubIcon from "@mui/icons-material/Hub";
import LinkIcon from "@mui/icons-material/Link";
import CloudIcon from "@mui/icons-material/Cloud";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import CloudDoneIcon from "@mui/icons-material/CloudDone";
import StorageIcon from "@mui/icons-material/Storage";
import FolderIcon from "@mui/icons-material/Folder";
import DescriptionIcon from "@mui/icons-material/Description";
import ArticleIcon from "@mui/icons-material/Article";
import NotesIcon from "@mui/icons-material/Notes";
import ChecklistIcon from "@mui/icons-material/Checklist";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import DoneIcon from "@mui/icons-material/Done";
import PendingIcon from "@mui/icons-material/Pending";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoIcon from "@mui/icons-material/Info";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SearchIcon from "@mui/icons-material/Search";
import TuneIcon from "@mui/icons-material/Tune";
import SettingsIcon from "@mui/icons-material/Settings";
import TimerIcon from "@mui/icons-material/Timer";
import EventIcon from "@mui/icons-material/Event";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TodayIcon from "@mui/icons-material/Today";

export type SelectOptionIconCatalogEntry = {
    key: string;
    label: string;
    Icon: SvgIconComponent;
};

export const DEFAULT_SELECT_OPTION_ICON_KEY = "circle";

export const SELECT_OPTION_ICON_CATALOG: SelectOptionIconCatalogEntry[] = [
    { key: "circle", label: "Circle", Icon: RadioButtonUncheckedIcon },
    { key: "star", label: "Star", Icon: StarIcon },
    { key: "heart", label: "Heart", Icon: FavoriteIcon },
    { key: "bolt", label: "Bolt", Icon: BoltIcon },
    { key: "flame", label: "Flame", Icon: WhatshotIcon },
    { key: "sparkles", label: "Sparkles", Icon: AutoAwesomeIcon },
    { key: "flash", label: "Flash", Icon: FlashOnIcon },
    { key: "shield", label: "Shield", Icon: ShieldIcon },
    { key: "security", label: "Security", Icon: SecurityIcon },
    { key: "firedept", label: "Fire", Icon: LocalFireDepartmentIcon },
    { key: "water", label: "Water", Icon: WaterDropIcon },
    { key: "snow", label: "Snow", Icon: AcUnitIcon },
    { key: "wind", label: "Wind", Icon: AirIcon },
    { key: "storm", label: "Storm", Icon: ThunderstormIcon },
    { key: "globe", label: "Globe", Icon: PublicIcon },
    { key: "forest", label: "Forest", Icon: ForestIcon },
    { key: "pet", label: "Pet", Icon: PetsIcon },
    { key: "bug", label: "Bug", Icon: BugReportIcon },
    { key: "mind", label: "Mind", Icon: PsychologyIcon },
    { key: "book", label: "Book", Icon: MenuBookIcon },
    { key: "idea", label: "Idea", Icon: LightbulbIcon },
    { key: "rocket", label: "Rocket", Icon: RocketLaunchIcon },
    { key: "tool", label: "Tool", Icon: BuildIcon },
    { key: "construction", label: "Construction", Icon: ConstructionIcon },
    { key: "handyman", label: "Handyman", Icon: HandymanIcon },
    { key: "science", label: "Science", Icon: ScienceIcon },
    { key: "biotech", label: "Biotech", Icon: BiotechIcon },
    { key: "healing", label: "Healing", Icon: HealingIcon },
    { key: "hospital", label: "Hospital", Icon: LocalHospitalIcon },
    { key: "medical", label: "Medical", Icon: MedicalServicesIcon },
    { key: "spa", label: "Spa", Icon: SpaIcon },
    { key: "magic", label: "Magic", Icon: AutoFixHighIcon },
    { key: "color", label: "Color", Icon: ColorLensIcon },
    { key: "palette", label: "Palette", Icon: PaletteIcon },
    { key: "brush", label: "Brush", Icon: BrushIcon },
    { key: "camera", label: "Camera", Icon: CameraAltIcon },
    { key: "photo", label: "Photo", Icon: PhotoIcon },
    { key: "image", label: "Image", Icon: ImageIcon },
    { key: "music", label: "Music", Icon: MusicNoteIcon },
    { key: "equalizer", label: "Equalizer", Icon: GraphicEqIcon },
    { key: "headphones", label: "Headphones", Icon: HeadphonesIcon },
    { key: "mic", label: "Mic", Icon: MicIcon },
    { key: "theater", label: "Theater", Icon: TheaterComedyIcon },
    { key: "game", label: "Game", Icon: SportsEsportsIcon },
    { key: "mma", label: "Combat", Icon: SportsMmaIcon },
    { key: "business", label: "Business", Icon: BusinessIcon },
    { key: "work", label: "Work", Icon: WorkIcon },
    { key: "bank", label: "Bank", Icon: AccountBalanceIcon },
    { key: "gavel", label: "Gavel", Icon: GavelIcon },
    { key: "groups", label: "Groups", Icon: GroupsIcon },
    { key: "group", label: "Group", Icon: GroupIcon },
    { key: "person", label: "Person", Icon: PersonIcon },
    { key: "person-outline", label: "Person Outline", Icon: PersonOutlineIcon },
    { key: "face", label: "Face", Icon: FaceIcon },
    { key: "badge", label: "Badge", Icon: BadgeIcon },
    { key: "military", label: "Military", Icon: MilitaryTechIcon },
    { key: "trophy", label: "Trophy", Icon: EmojiEventsIcon },
    { key: "premium", label: "Premium", Icon: WorkspacePremiumIcon },
    { key: "school", label: "School", Icon: SchoolIcon },
    { key: "history", label: "History", Icon: HistoryEduIcon },
    { key: "travel", label: "Travel", Icon: TravelExploreIcon },
    { key: "explore", label: "Explore", Icon: ExploreIcon },
    { key: "map", label: "Map", Icon: MapIcon },
    { key: "place", label: "Place", Icon: PlaceIcon },
    { key: "home", label: "Home", Icon: HomeIcon },
    { key: "location", label: "Location", Icon: LocationOnIcon },
    { key: "terrain", label: "Terrain", Icon: TerrainIcon },
    { key: "flight", label: "Flight", Icon: FlightIcon },
    { key: "boat", label: "Boat", Icon: DirectionsBoatIcon },
    { key: "car", label: "Car", Icon: DirectionsCarIcon },
    { key: "train", label: "Train", Icon: TrainIcon },
    { key: "bike", label: "Bike", Icon: TwoWheelerIcon },
    { key: "restaurant", label: "Restaurant", Icon: RestaurantIcon },
    { key: "cafe", label: "Cafe", Icon: LocalCafeIcon },
    { key: "bar", label: "Bar", Icon: LocalBarIcon },
    { key: "library", label: "Library", Icon: LocalLibraryIcon },
    { key: "view", label: "View", Icon: VisibilityIcon },
    { key: "lock", label: "Lock", Icon: LockIcon },
    { key: "vpn-key", label: "VPN Key", Icon: VpnKeyIcon },
    { key: "key", label: "Key", Icon: KeyIcon },
    { key: "terminal", label: "Terminal", Icon: TerminalIcon },
    { key: "code", label: "Code", Icon: CodeIcon },
    { key: "data", label: "Data", Icon: DataObjectIcon },
    { key: "hub", label: "Hub", Icon: HubIcon },
    { key: "link", label: "Link", Icon: LinkIcon },
    { key: "cloud", label: "Cloud", Icon: CloudIcon },
    { key: "cloud-queue", label: "Cloud Queue", Icon: CloudQueueIcon },
    { key: "cloud-done", label: "Cloud Done", Icon: CloudDoneIcon },
    { key: "storage", label: "Storage", Icon: StorageIcon },
    { key: "folder", label: "Folder", Icon: FolderIcon },
    { key: "description", label: "Description", Icon: DescriptionIcon },
    { key: "article", label: "Article", Icon: ArticleIcon },
    { key: "notes", label: "Notes", Icon: NotesIcon },
    { key: "checklist", label: "Checklist", Icon: ChecklistIcon },
    { key: "task", label: "Task", Icon: TaskAltIcon },
    { key: "done", label: "Done", Icon: DoneIcon },
    { key: "pending", label: "Pending", Icon: PendingIcon },
    { key: "warning", label: "Warning", Icon: WarningAmberIcon },
    { key: "error", label: "Error", Icon: ErrorOutlineIcon },
    { key: "info", label: "Info", Icon: InfoIcon },
    { key: "help", label: "Help", Icon: HelpOutlineIcon },
    { key: "search", label: "Search", Icon: SearchIcon },
    { key: "tune", label: "Tune", Icon: TuneIcon },
    { key: "settings", label: "Settings", Icon: SettingsIcon },
    { key: "timer", label: "Timer", Icon: TimerIcon },
    { key: "event", label: "Event", Icon: EventIcon },
    { key: "calendar", label: "Calendar", Icon: CalendarMonthIcon },
    { key: "today", label: "Today", Icon: TodayIcon },
];

const iconByKey = new Map(
    SELECT_OPTION_ICON_CATALOG.map((entry) => [entry.key, entry]),
);

export const resolveSelectOptionIconEntry = (
    iconKey: string | null | undefined,
): SelectOptionIconCatalogEntry => {
    const normalized = iconKey?.trim();
    if (normalized) {
        const matched = iconByKey.get(normalized);
        if (matched) {
            return matched;
        }
    }

    return iconByKey.get(DEFAULT_SELECT_OPTION_ICON_KEY)!;
};

export const renderSelectOptionIcon = (
    iconKey: string | null | undefined,
    size = 14,
): React.ReactElement => {
    const entry = resolveSelectOptionIconEntry(iconKey);
    const Icon = entry.Icon;
    return <Icon sx={{ fontSize: size }} />;
};
