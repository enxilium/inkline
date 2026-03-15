import Image from "next/image";
import Link from "next/link";
import {
    PenTool,
    Map,
    Sparkles,
    ArrowUpDown,
    ArrowRight,
    Github,
    Download,
    Check,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";
import {
    GITHUB_REPO,
    CURRENT_VERSION,
    FEATURES_OVERVIEW,
} from "@/lib/constants";

const iconMap = {
    "pen-tool": PenTool,
    map: Map,
    sparkles: Sparkles,
    "arrow-up-down": ArrowUpDown,
} as const;

const comparisonFeatures = [
    {
        feature: "Free & Open Source",
        inkline: true,
        scrivener: false,
        gdocs: false,
        campfire: false,
    },
    {
        feature: "World-Building Tools",
        inkline: true,
        scrivener: true,
        gdocs: false,
        campfire: true,
    },
    {
        feature: "AI Writing Assistant",
        inkline: true,
        scrivener: false,
        gdocs: false,
        campfire: true,
    },
    {
        feature: "AI Image & Music Gen",
        inkline: true,
        scrivener: false,
        gdocs: false,
        campfire: false,
    },
    {
        feature: "Flexible Timelines",
        inkline: true,
        scrivener: false,
        gdocs: false,
        campfire: false,
    },
    {
        feature: "EPUB Export",
        inkline: true,
        scrivener: true,
        gdocs: false,
        campfire: true,
    },
    {
        feature: "Cloud Sync",
        inkline: true,
        scrivener: true,
        gdocs: true,
        campfire: true,
    },
    {
        feature: "Offline-First",
        inkline: true,
        scrivener: true,
        gdocs: false,
        campfire: true,
    },
];

export default function Home() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative py-24 md:py-32 lg:py-40">
                    <FadeIn className="flex flex-col items-center text-center">
                        <Badge className="mb-6">
                            <Github className="h-3.5 w-3.5" />
                            Open Source &middot; {CURRENT_VERSION}
                        </Badge>
                        <h1 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
                            Every story starts with a{" "}
                            <span className="gradient-text">single stroke</span>
                        </h1>
                        <p className="mt-6 max-w-2xl text-lg text-muted md:text-xl">
                            The free, open-source writing studio built by
                            writers, for writers. World-building, AI tools, and
                            manuscript management — all in one place.
                        </p>
                        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                            <Button href="/download" size="lg">
                                <Download className="h-4 w-4" />
                                Download for Free
                            </Button>
                            <Button
                                href="/features"
                                variant="secondary"
                                size="lg"
                            >
                                Explore Features
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button
                                href="https://jacemu.xyz"
                                variant="ghost"
                                size="lg"
                                external
                            >
                                See all my other projects
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Banner Screenshot */}
            <section className="relative">
                <Container>
                    <FadeIn delay={200}>
                        <div className="relative overflow-hidden rounded-2xl border border-border glow">
                            <Image
                                src="/images/banner.png"
                                alt="Inkline Studio"
                                width={1920}
                                height={600}
                                className="w-full"
                                priority
                            />
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Social Proof */}
            <section className="py-16 md:py-20">
                <Container>
                    <FadeIn>
                        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12">
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <div className="h-2 w-2 rounded-full bg-primary-light" />
                                100% Free Forever
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <div className="h-2 w-2 rounded-full bg-primary" />
                                MIT Licensed
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted">
                                <div className="h-2 w-2 rounded-full bg-primary-dark" />
                                Windows &middot; Mac &middot; Linux
                            </div>
                            <a
                                href={GITHUB_REPO}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-primary"
                            >
                                <Github className="h-4 w-4" />
                                Star on GitHub
                            </a>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Feature Highlights */}
            <section className="py-16 md:py-24">
                <Container>
                    <SectionHeader
                        label="Features"
                        title="Everything you need to tell your story"
                        description="From first draft to finished manuscript, Inkline gives you the tools to write, organize, and bring your world to life."
                    />
                    <div className="grid gap-6 md:grid-cols-2">
                        {FEATURES_OVERVIEW.map((feature, i) => {
                            const Icon = iconMap[feature.icon];
                            return (
                                <FadeIn key={feature.title} delay={i * 100}>
                                    <Link href={feature.href}>
                                        <Card className="group h-full">
                                            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                                                <Icon className="h-6 w-6 text-primary" />
                                            </div>
                                            <h3 className="text-xl font-semibold group-hover:text-primary transition-colors">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-2 text-muted">
                                                {feature.description}
                                            </p>
                                            <div className="mt-4 flex items-center gap-1 text-sm text-primary opacity-0 transition-opacity group-hover:opacity-100">
                                                Learn more{" "}
                                                <ArrowRight className="h-3.5 w-3.5" />
                                            </div>
                                        </Card>
                                    </Link>
                                </FadeIn>
                            );
                        })}
                    </div>
                </Container>
            </section>

            {/* Showcase */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container>
                    <SectionHeader
                        label="Interface"
                        title="Designed for focus"
                        description="A clean, purposeful interface that stays out of your way — until you need it."
                    />
                    <div className="grid gap-8 md:grid-cols-2">
                        <FadeIn delay={150}>
                            <div className="overflow-hidden rounded-2xl border border-border">
                                <Image
                                    src="/images/features-special-editor.png"
                                    alt="Dedicated editors for characters, locations, and organizations"
                                    width={1400}
                                    height={900}
                                    className="w-full"
                                />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">
                                Special Editors
                            </h3>
                            <p className="mt-1 text-sm text-muted">
                                Keep track of characters, organizations, and
                                locations with dedicated editors designed for
                                storytelling.
                            </p>
                        </FadeIn>
                        <FadeIn>
                            <div className="overflow-hidden rounded-2xl border border-border">
                                <Image
                                    src="/images/features-minimal-interface.png"
                                    alt="Minimal interface with optional AI tools"
                                    width={1400}
                                    height={900}
                                    className="w-full"
                                />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold">
                                Minimal Interface
                            </h3>
                            <p className="mt-1 text-sm text-muted">
                                Catch plot holes, review pacing, and reference
                                your worldbuilding — all from a clean,
                                distraction-free editor.
                            </p>
                        </FadeIn>
                    </div>
                </Container>
            </section>

            {/* One Click Import */}
            <section className="py-16 md:py-24">
                <Container>
                    <SectionHeader
                        label="Import"
                        title="One-click import"
                        description="Bring your existing work into Inkline in seconds. Import EPUBs created from tools like Google Docs and Microsoft Word with a single click."
                    />
                    <div className="grid gap-8 md:grid-cols-2 md:items-center">
                        <FadeIn delay={150}>
                            <div className="overflow-hidden rounded-2xl border border-border glow">
                                <Image
                                    src="/images/features-import.png"
                                    alt="One-click EPUB import from Google Docs and Microsoft Word"
                                    width={1920}
                                    height={1080}
                                    className="w-full"
                                />
                            </div>
                        </FadeIn>
                        <FadeIn>
                            <div className="rounded-2xl p-6 md:p-8">
                                <h3 className="text-2xl font-semibold">
                                    Move from docs to drafts, instantly
                                </h3>
                                <p className="mt-3 text-muted">
                                    Export your manuscript as EPUB from Google
                                    Docs or Microsoft Word, then import it into
                                    Inkline with one click.
                                </p>
                                <p className="mt-2 text-muted">
                                    Your chapters come in ready for editing,
                                    so you can keep writing without manual
                                    copy-paste cleanup.
                                </p>
                            </div>
                        </FadeIn>
                    </div>
                </Container>
            </section>

            {/* Comparison Table */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <SectionHeader
                        label="Compare"
                        title="How Inkline stacks up"
                        description="See how Inkline compares to other popular writing tools."
                    />
                    <FadeIn>
                        <div className="overflow-x-auto rounded-2xl border border-border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-card">
                                        <th className="px-6 py-4 text-left font-medium text-muted">
                                            Feature
                                        </th>
                                        <th className="px-6 py-4 text-center font-semibold text-primary">
                                            Inkline
                                        </th>
                                        <th className="px-6 py-4 text-center font-medium text-muted">
                                            Scrivener
                                        </th>
                                        <th className="px-6 py-4 text-center font-medium text-muted">
                                            Google Docs
                                        </th>
                                        <th className="px-6 py-4 text-center font-medium text-muted">
                                            Campfire
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonFeatures.map((row, i) => (
                                        <tr
                                            key={row.feature}
                                            className={
                                                i % 2 === 0
                                                    ? "bg-background"
                                                    : "bg-card/50"
                                            }
                                        >
                                            <td className="px-6 py-3 font-medium">
                                                {row.feature}
                                            </td>
                                            {(
                                                [
                                                    "inkline",
                                                    "scrivener",
                                                    "gdocs",
                                                    "campfire",
                                                ] as const
                                            ).map((tool) => (
                                                <td
                                                    key={tool}
                                                    className="px-6 py-3 text-center"
                                                >
                                                    {row[tool] ? (
                                                        <Check
                                                            className={`inline h-4 w-4 ${tool === "inkline" ? "text-primary" : "text-muted"}`}
                                                        />
                                                    ) : (
                                                        <span className="text-muted/40">
                                                            &mdash;
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* CTA */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <FadeIn>
                        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-card to-primary-dark/10 px-8 py-16 text-center md:px-16">
                            <h2 className="text-3xl font-bold md:text-4xl">
                                Ready to write your story?
                            </h2>
                            <p className="mt-4 text-lg text-muted">
                                Download Inkline Studio for free. No accounts,
                                no paywalls, no limits.
                            </p>
                            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                <Button href="/download" size="lg">
                                    <Download className="h-4 w-4" />
                                    Download for Free
                                </Button>
                                <Button
                                    href={GITHUB_REPO}
                                    variant="secondary"
                                    size="lg"
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
