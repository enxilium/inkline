import type { Metadata } from "next";
import Image from "next/image";
import {
    Download,
    Monitor,
    Apple,
    Terminal,
    Github,
    Cpu,
    HardDrive,
    MemoryStick,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";
import { DOWNLOADS, CURRENT_VERSION, GITHUB_REPO } from "@/lib/constants";

export const metadata: Metadata = {
    title: "Download",
    description:
        "Download Inkline Studio for Windows, macOS, or Linux. Free and open-source, always.",
};

const platforms = [
    {
        key: "windows" as const,
        icon: Monitor,
        ...DOWNLOADS.windows,
    },
    {
        key: "macos" as const,
        icon: Apple,
        ...DOWNLOADS.macos,
    },
    {
        key: "linux" as const,
        icon: Terminal,
        ...DOWNLOADS.linux,
    },
];

const changelog = [
    {
        version: "v0.1.1-alpha",
        date: "March 2026",
        changes: [
            "Added auto-update functionality",
            "Various bug fixes and stability improvements",
            "Multi-platform installer support (Windows, macOS, Linux)",
        ],
    },
    {
        version: "v0.1.0-alpha",
        date: "January 2025",
        changes: [
            "Initial alpha release",
            "Core manuscript editor with rich text support",
            "Character, location, and organization editors",
            "Timeline system with custom calendar support",
            "AI chat assistant integration",
            "EPUB export and document import",
            "Cloud sync via Supabase",
            "LanguageTool integration for grammar checking",
        ],
    },
];

export default function DownloadPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="text-center">
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Download{" "}
                            <span className="gradient-text">
                                Inkline Studio
                            </span>
                        </h1>
                        <p className="mt-6 mx-auto max-w-2xl text-lg text-muted">
                            Free and open-source, available on Windows, macOS,
                            and Linux. No accounts, no paywalls — just download
                            and start writing.
                        </p>
                        <Badge className="mt-4">{CURRENT_VERSION}</Badge>
                    </FadeIn>
                </Container>
            </section>

            {/* Download Banner */}
            <section className="pb-8">
                <Container>
                    <FadeIn>
                        <div className="overflow-hidden rounded-2xl border border-border">
                            <Image
                                src="/images/download.png"
                                alt="Download Inkline Studio"
                                width={1920}
                                height={600}
                                className="w-full"
                                priority
                            />
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Platform Cards */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <div className="grid gap-6 md:grid-cols-3">
                        {platforms.map((platform, i) => (
                            <FadeIn key={platform.key} delay={i * 100}>
                                <Card className="flex flex-col items-center text-center h-full p-8">
                                    <div className="mb-4 rounded-2xl bg-primary/10 p-4">
                                        <platform.icon className="h-8 w-8 text-primary" />
                                    </div>
                                    <h3 className="text-xl font-bold">
                                        {platform.label}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted">
                                        {platform.description}
                                    </p>
                                    <div className="mt-6 w-full">
                                        <Button
                                            href={platform.url}
                                            external
                                            className="w-full"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </Button>
                                    </div>
                                    <p className="mt-3 text-xs text-muted">
                                        {platform.fileName}
                                    </p>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* System Requirements */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container size="md">
                    <SectionHeader
                        label="Requirements"
                        title="System requirements"
                    />
                    <div className="grid gap-6 md:grid-cols-2">
                        <FadeIn>
                            <Card hover={false}>
                                <h3 className="text-lg font-semibold mb-4">
                                    Minimum
                                </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-sm text-muted">
                                        <Cpu className="h-4 w-4 shrink-0 text-primary" />
                                        Any modern 64-bit processor
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-muted">
                                        <MemoryStick className="h-4 w-4 shrink-0 text-primary" />
                                        4 GB RAM
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-muted">
                                        <HardDrive className="h-4 w-4 shrink-0 text-primary" />
                                        500 MB available disk space
                                    </li>
                                </ul>
                            </Card>
                        </FadeIn>
                        <FadeIn delay={100}>
                            <Card hover={false}>
                                <h3 className="text-lg font-semibold mb-4">
                                    Recommended for AI Features
                                </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3 text-sm text-muted">
                                        <Cpu className="h-4 w-4 shrink-0 text-primary" />
                                        Modern multi-core processor
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-muted">
                                        <MemoryStick className="h-4 w-4 shrink-0 text-primary" />
                                        8 GB RAM
                                    </li>
                                    <li className="flex items-center gap-3 text-sm text-muted">
                                        <HardDrive className="h-4 w-4 shrink-0 text-primary" />
                                        Dedicated GPU (NVIDIA recommended for
                                        local AI)
                                    </li>
                                </ul>
                                <p className="mt-4 text-xs text-muted">
                                    Note: Local AI image/music generation via
                                    ComfyUI is currently Windows-only.
                                </p>
                            </Card>
                        </FadeIn>
                    </div>
                </Container>
            </section>

            {/* Changelog */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <SectionHeader
                        label="Changelog"
                        title="What's new"
                        description="Track the latest changes and improvements."
                    />
                    <div className="space-y-8">
                        {changelog.map((release, i) => (
                            <FadeIn key={release.version} delay={i * 100}>
                                <Card hover={false}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <Badge>{release.version}</Badge>
                                        <span className="text-sm text-muted">
                                            {release.date}
                                        </span>
                                    </div>
                                    <ul className="space-y-2">
                                        {release.changes.map((change) => (
                                            <li
                                                key={change}
                                                className="flex items-start gap-2 text-sm text-muted"
                                            >
                                                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                {change}
                                            </li>
                                        ))}
                                    </ul>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                    <FadeIn delay={200}>
                        <div className="mt-8 text-center">
                            <Button
                                href={`${GITHUB_REPO}/releases`}
                                variant="secondary"
                                external
                            >
                                <Github className="h-4 w-4" />
                                View all releases
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Build from Source */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container size="sm">
                    <FadeIn>
                        <div className="text-center">
                            <Github className="mx-auto h-10 w-10 text-muted mb-4" />
                            <h2 className="text-2xl font-bold">
                                Build from source
                            </h2>
                            <p className="mt-4 text-muted">
                                Inkline is open-source under the MIT License.
                                Clone the repository, explore the code, and
                                build it yourself.
                            </p>
                            <div className="mt-6 rounded-xl border border-border bg-background p-4 text-left font-mono text-sm text-muted">
                                <p>
                                    <span className="text-primary">$</span> git
                                    clone {GITHUB_REPO}.git
                                </p>
                                <p>
                                    <span className="text-primary">$</span> cd
                                    inkline
                                </p>
                                <p>
                                    <span className="text-primary">$</span> npm
                                    install
                                </p>
                                <p>
                                    <span className="text-primary">$</span> npm
                                    start
                                </p>
                            </div>
                            <div className="mt-6">
                                <Button
                                    href={GITHUB_REPO}
                                    variant="secondary"
                                    external
                                >
                                    <Github className="h-4 w-4" />
                                    View on GitHub
                                </Button>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </section>
        </>
    );
}
