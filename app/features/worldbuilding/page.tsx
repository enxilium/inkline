import type { Metadata } from "next";
import Image from "next/image";
import {
    Map,
    Users,
    MapPin,
    Building2,
    Clock,
    Link2,
    Tag,
    ImageIcon,
    Music,
    Layers,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";

export const metadata: Metadata = {
    title: "Worldbuilding",
    description:
        "Build immersive worlds with dedicated editors for characters, locations, organizations, and timelines — all interconnected.",
};

const entities = [
    {
        icon: Users,
        title: "Characters",
        color: "text-primary-light",
        features: [
            "Comprehensive profiles with name, race, age, and detailed descriptions",
            "Personality traits, personal goals, secrets, and supernatural powers",
            "Relationship tracking — current location, background, and organization membership",
            "Visual gallery with reference images and generated portraits",
            "Themed background music and curated playlists",
            "Custom metafields to fit any story",
        ],
    },
    {
        icon: MapPin,
        title: "Locations",
        color: "text-primary",
        features: [
            "Rich descriptions covering landscape, architecture, and overall vibe",
            "Culture, traditions, customs, and societal norms documentation",
            "Historical events and important backstory",
            "Conflicts and tensions that affect the location",
            "Connected characters and organizations tracking",
            "Atmospheric music and reference imagery",
        ],
    },
    {
        icon: Building2,
        title: "Organizations",
        color: "text-primary-dark",
        features: [
            "Define factions, guilds, institutions, and groups",
            "Mission statements and organizational purpose",
            "Member rosters with character links",
            "Locations where the organization operates",
            "Visual assets, background music, and playlists",
            "Custom metafields to fit any story need",
        ],
    },
];

const timelineFeatures = [
    {
        icon: Clock,
        title: "CE/BCE Timelines",
        description:
            "Support for year, month, and day granularity with real-world calendar systems.",
    },
    {
        icon: Layers,
        title: "Custom Time Units",
        description:
            "Fantasy ages, world-specific calendar systems, or any custom time format.",
    },
    {
        icon: Link2,
        title: "Cross-Entity Events",
        description:
            "Link events to chapters, characters, locations, and organizations.",
    },
    {
        icon: Tag,
        title: "Event Details",
        description:
            "Full date support with descriptions and multiple entity associations.",
    },
];

export default function WorldbuildingPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="max-w-3xl">
                        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                            <Map className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Worldbuilding
                        </h1>
                        <p className="mt-6 text-lg text-muted">
                            Build rich, interconnected worlds with dedicated
                            editors for every story element. Characters,
                            locations, organizations, and timelines — all linked
                            together and always at your fingertips.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            {/* Screenshot */}
            <section className="pb-16">
                <Container>
                    <FadeIn>
                        <div className="overflow-hidden rounded-2xl border border-border glow">
                            <Image
                                src="/images/features-special-editor.png"
                                alt="Inkline Studio worldbuilding editor"
                                width={1400}
                                height={900}
                                className="w-full"
                                priority
                            />
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Entity Sections */}
            <section className="py-16 md:py-24">
                <Container>
                    <SectionHeader
                        label="Story Elements"
                        title="Every element, deeply connected"
                        description="First-class support for the building blocks of your world — not an afterthought."
                    />
                    <div className="space-y-12">
                        {entities.map((entity, i) => (
                            <FadeIn key={entity.title} delay={i * 100}>
                                <Card hover={false} className="p-8">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="rounded-xl bg-primary/10 p-3">
                                            <entity.icon
                                                className={`h-6 w-6 ${entity.color}`}
                                            />
                                        </div>
                                        <h3 className="text-2xl font-bold">
                                            {entity.title}
                                        </h3>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {entity.features.map((feat) => (
                                            <div
                                                key={feat}
                                                className="flex items-start gap-2"
                                            >
                                                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                <p className="text-sm text-muted">
                                                    {feat}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Timelines */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container>
                    <SectionHeader
                        label="Coming Soon: Timelines"
                        title="Plot your story across time"
                        description="Create flexible timelines with support for real-world calendars, fantasy ages, or fully custom systems."
                    />
                    <div className="grid gap-6 sm:grid-cols-2">
                        {timelineFeatures.map((feature, i) => (
                            <FadeIn key={feature.title} delay={i * 75}>
                                <Card className="h-full">
                                    <div className="flex items-start gap-4">
                                        <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
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

            {/* Connections */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <FadeIn>
                        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-primary-dark/5 p-8 md:p-12">
                            <div className="flex items-center gap-3 mb-4">
                                <Link2 className="h-6 w-6 text-primary" />
                                <h2 className="text-2xl font-bold">
                                    Everything connects
                                </h2>
                            </div>
                            <p className="text-muted max-w-2xl">
                                Characters live in locations. Organizations
                                operate across regions. Events tie to chapters.
                                In Inkline, these connections are first-class —
                                track which characters are in which locations,
                                which organizations they belong to, and how
                                events ripple across your entire world.
                            </p>
                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-xl border border-border bg-background p-4 text-center">
                                    <ImageIcon className="mx-auto h-8 w-8 text-primary-light mb-2" />
                                    <p className="text-sm font-medium">
                                        Reference Images
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        Gallery for every entity
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background p-4 text-center">
                                    <Music className="mx-auto h-8 w-8 text-primary mb-2" />
                                    <p className="text-sm font-medium">
                                        Themed Music
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        BGM and playlists
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background p-4 text-center">
                                    <Tag className="mx-auto h-8 w-8 text-primary-dark mb-2" />
                                    <p className="text-sm font-medium">
                                        Custom Metafields
                                    </p>
                                    <p className="text-xs text-muted mt-1">
                                        Define your way
                                    </p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* CTA */}
            <section className="py-16 md:py-24">
                <Container size="sm">
                    <FadeIn>
                        <div className="text-center">
                            <h2 className="text-3xl font-bold">
                                Build your world
                            </h2>
                            <p className="mt-4 text-muted">
                                Download Inkline Studio and start bringing your
                                world to life.
                            </p>
                            <div className="mt-8">
                                <Button href="/download" size="lg">
                                    <Download className="h-4 w-4" />
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
