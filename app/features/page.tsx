import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    PenTool,
    Map,
    Sparkles,
    ArrowRight,
    BookOpen,
    Users,
    MapPin,
    Building2,
    Clock,
    Wand2,
    Music,
    ImageIcon,
    MessageSquare,
    ArrowUpDown,
    Cloud,
    FileDown,
    Import,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";

export const metadata: Metadata = {
    title: "Features",
    description:
        "Discover all the features that make Inkline Studio the perfect writing tool — from manuscript editing to worldbuilding and AI-powered creative tools.",
};

const categories = [
    {
        title: "Writing & Editing",
        description:
            "A distraction-free editor with rich formatting, grammar checking, chapter management, and one-click export.",
        icon: PenTool,
        href: "/features/writing",
        image: "/images/features-minimal-interface.png",
    },
    {
        title: "Worldbuilding",
        description:
            "Dedicated editors with deep interconnections for characters, locations, organizations, and timelines.",
        icon: Map,
        href: "/features/worldbuilding",
        image: "/images/features-special-editor.png",
    },
    {
        title: "AI Tools",
        description:
            "Optional AI assistant for editing, grammar checking, image generation, music creation, and playlist curation.",
        icon: Sparkles,
        href: "/features/ai",
        image: "/images/features-minimal-interface.png",
    },
    {
        title: "Sync & Export",
        description:
            "Keep projects synced across devices, import existing drafts, and export polished EPUB files.",
        icon: ArrowUpDown,
        href: "/features/sync-export",
        image: "/images/features-import.png",
    },
];

const allFeatures = [
    {
        icon: BookOpen,
        title: "Chapter Management",
        description:
            "Create, reorder, rename, and organize chapters with ease.",
    },
    {
        icon: PenTool,
        title: "Rich Text Editing",
        description:
            "Full formatting with bold, italic, headings, lists, blockquotes, and more.",
    },
    {
        icon: Users,
        title: "Character Profiles",
        description: "Track traits, relationships, powers, secrets, and goals.",
    },
    {
        icon: MapPin,
        title: "Location Tracking",
        description:
            "Document culture, history, conflicts, and connected characters.",
    },
    {
        icon: Building2,
        title: "Organizations",
        description:
            "Define factions with missions, members, and operational locations.",
    },
    {
        icon: Clock,
        title: "Flexible Timelines",
        description: "CE/BCE, fantasy ages, or fully custom calendar systems.",
    },
    {
        icon: MessageSquare,
        title: "AI Chat Assistant",
        description:
            "Context-aware conversations that reference your worldbuilding.",
    },
    {
        icon: Wand2,
        title: "Grammar & Style",
        description:
            "Integrated LanguageTool for real-time grammar and spelling feedback.",
    },
    {
        icon: ImageIcon,
        title: "Image Generation",
        description:
            "Generate reference portraits and landscapes from descriptions.",
    },
    {
        icon: Music,
        title: "Music Generation",
        description:
            "Create thematic background music for characters and locations.",
    },
    {
        icon: Cloud,
        title: "Cloud Sync",
        description: "Seamless synchronization across all your devices.",
    },
    {
        icon: FileDown,
        title: "EPUB Export",
        description: "One-click export to industry-standard EPUB format.",
    },
    {
        icon: Import,
        title: "One-Click Import",
        description:
            "Import from Google Docs, Microsoft Word, and other formats.",
    },
];

export default function FeaturesPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="text-center">
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Powerful features,{" "}
                            <span className="gradient-text">
                                simple interface
                            </span>
                        </h1>
                        <p className="mt-6 mx-auto max-w-2xl text-lg text-muted">
                            Everything you need to write, organize, and bring
                            your story to life — without the complexity.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            {/* Category Cards */}
            <section className="pb-16 md:pb-24">
                <Container>
                    <div className="space-y-16">
                        {categories.map((category, i) => (
                            <FadeIn key={category.title} delay={i * 100}>
                                <Link
                                    href={category.href}
                                    className="group block"
                                >
                                    <div
                                        className={`grid gap-8 items-center rounded-3xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/30 md:grid-cols-2 md:p-10 ${
                                            i % 2 === 1
                                                ? "md:direction-rtl"
                                                : ""
                                        }`}
                                    >
                                        <div
                                            className={
                                                i % 2 === 1 ? "md:order-2" : ""
                                            }
                                        >
                                            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                                                <category.icon className="h-6 w-6 text-primary" />
                                            </div>
                                            <h2 className="text-2xl font-bold group-hover:text-primary transition-colors md:text-3xl">
                                                {category.title}
                                            </h2>
                                            <p className="mt-3 text-muted">
                                                {category.description}
                                            </p>
                                            <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary">
                                                Learn more{" "}
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <div
                                            className={`overflow-hidden rounded-xl border border-border ${
                                                i % 2 === 1 ? "md:order-1" : ""
                                            }`}
                                        >
                                            <Image
                                                src={category.image}
                                                alt={category.title}
                                                width={1400}
                                                height={900}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </Link>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* All Features Grid */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container>
                    <SectionHeader
                        label="All Features"
                        title="The complete toolkit"
                        description="A comprehensive set of tools designed specifically for creative writers."
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {allFeatures.map((feature, i) => (
                            <FadeIn key={feature.title} delay={i * 50}>
                                <Card className="h-full">
                                    <div className="flex items-start gap-4">
                                        <div className="shrink-0 rounded-lg bg-primary/10 p-2">
                                            <feature.icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-1 text-sm text-muted">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* CTA */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <FadeIn>
                        <div className="text-center">
                            <h2 className="text-3xl font-bold">
                                See it in action
                            </h2>
                            <p className="mt-4 text-lg text-muted">
                                Download Inkline Studio and start writing today.
                            </p>
                            <div className="mt-8">
                                <Button href="/download" size="lg">
                                    Download for Free
                                </Button>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </section>
        </>
    );
}
