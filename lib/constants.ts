export const SITE_NAME = "Inkline Studio";
export const SITE_DESCRIPTION =
    "The free, open-source writing studio built by writers, for writers. World-building, AI tools, and manuscript management in one place.";
export const SITE_URL = "https://inklinestudio.com";
export const GITHUB_REPO = "https://github.com/enxilium/inkline";
export const CURRENT_VERSION = "v0.1.1-alpha";

export const DOWNLOADS = {
    windows: {
        url: "https://github.com/enxilium/inkline/releases/download/v0.1.1-alpha/inkline-0.1.1-alpha.Setup.exe",
        label: "Windows",
        description: "Windows 10 or later",
        fileName: "inkline-0.1.1-alpha.Setup.exe",
    },
    macos: {
        url: "https://github.com/enxilium/inkline/releases/download/v0.1.1-alpha/inkline-0.1.1-alpha-arm64.dmg",
        label: "macOS",
        description: "macOS 12+ (Apple Silicon)",
        fileName: "inkline-0.1.1-alpha-arm64.dmg",
    },
    linux: {
        url: "https://github.com/enxilium/inkline/releases/download/v0.1.1-alpha/inkline_0.1.1.alpha_amd64.deb",
        label: "Linux",
        description: "Ubuntu 20.04+ / Debian-based (.deb)",
        fileName: "inkline_0.1.1.alpha_amd64.deb",
    },
} as const;

export const NAV_LINKS = [
    {
        label: "Features",
        href: "/features",
        children: [
            { label: "Writing & Editing", href: "/features/writing" },
            { label: "Worldbuilding", href: "/features/worldbuilding" },
            { label: "AI Tools", href: "/features/ai" },
        ],
    },
    { label: "Download", href: "/download" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
] as const;

export const SOCIAL_LINKS = {
    github: GITHUB_REPO,
    discord: "https://discord.gg/inkline",
} as const;

export const TEAM = [
    {
        name: "enxilium",
        role: "Founder & Lead Developer",
        github: "https://github.com/enxilium",
        discord: "enxil.",
    },
    {
        name: "sukdip",
        role: "Co-Founder & Lead Designer",
        github: "https://github.com/sukdippa",
        discord: "sukdip",
    },
] as const;

export const FEATURES_OVERVIEW = [
    {
        title: "Distraction-Free Writing",
        description:
            "A clean, minimal editor designed to keep you in flow. Rich text formatting, chapter management, and one-click export.",
        icon: "pen-tool" as const,
        href: "/features/writing",
    },
    {
        title: "Deep Worldbuilding",
        description:
            "Dedicated editors for characters, locations, organizations, and timelines — all interconnected.",
        icon: "map" as const,
        href: "/features/worldbuilding",
    },
    {
        title: "AI-Powered Tools",
        description:
            "Optional AI assistant for editing, grammar checking, and generating reference images, music and playlists.",
        icon: "sparkles" as const,
        href: "/features/ai",
    },
    {
        title: "Sync & Export",
        description:
            "Work across devices with cloud sync, export to EPUB, and import from Google Docs or Word.",
        icon: "arrow-up-down" as const,
        href: "/download",
    },
] as const;
