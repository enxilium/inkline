import type { Metadata } from "next";
import {
    Heart,
    Code,
    Shield,
    Github,
    Users,
    Rocket,
    BookOpen,
    Globe,
    Plug,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";
import { GITHUB_REPO, TEAM } from "@/lib/constants";

export const metadata: Metadata = {
    title: "About",
    description:
        "Learn about Inkline Studio — our mission, our team, and our commitment to free, open-source software for creative writers.",
};

const values = [
    {
        icon: Heart,
        title: "Built for Writers",
        description:
            "Every feature is designed with creative authors in mind. We don't build for everyone — we build for storytellers.",
    },
    {
        icon: Code,
        title: "Open Source Forever",
        description:
            "Inkline is MIT licensed and always will be. No premium tiers, no feature gates. The complete tool is free for everyone.",
    },
    {
        icon: Shield,
        title: "Privacy First",
        description:
            "Your stories are yours. Local-first architecture means your data stays on your machine unless you choose to sync.",
    },
];

const roadmap = [
    {
        icon: BookOpen,
        title: "PDF Export",
        description: "Export manuscripts to PDF alongside EPUB.",
    },
    {
        icon: Globe,
        title: "Mobile Companion",
        description: "A companion app for reviewing and editing on the go.",
    },
    {
        icon: Plug,
        title: "Plugin System",
        description:
            "Extensible architecture to support community-built features.",
    },
];

export default function AboutPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Built by writers,{" "}
                            <span className="gradient-text">for writers</span>
                        </h1>
                        <p className="mt-6 text-lg text-muted">
                            Inkline Studio exists because we believe every
                            writer deserves professional tools — without
                            paywalls, subscriptions, or compromises.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            {/* Mission */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <FadeIn>
                        <div className="prose prose-invert max-w-none">
                            <div className="rounded-3xl border border-border bg-card p-8 md:p-12">
                                <h2 className="text-2xl font-bold mb-6">
                                    Our Story
                                </h2>
                                <div className="space-y-4 text-muted">
                                    <p>
                                        We started Inkline because the tools
                                        available to writers were either too
                                        expensive, too generic, or too limiting.
                                        Scrivener costs money. Google Docs
                                        wasn&apos;t built for novels. Campfire
                                        still has limited scope. We wanted
                                        something that combined the best of all
                                        worlds.
                                    </p>
                                    <p>
                                        Inkline Studio is a dedicated writing
                                        environment that understands
                                        storytelling. It offers manuscript
                                        editing and worldbuilding as first-class
                                        features, not afterthoughts. AI tools
                                        that assist rather than replace. Cloud
                                        sync that just works. And it&apos;s
                                        completely free, forever.
                                    </p>
                                    <p>
                                        We believe in building tools that
                                        respect writers — their creativity,
                                        their data, and their wallets.
                                        That&apos;s why Inkline is open-source
                                        under the MIT License, with no premium
                                        tiers or feature restrictions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Values */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container>
                    <SectionHeader label="Values" title="What we stand for" />
                    <div className="grid gap-6 md:grid-cols-3">
                        {values.map((value, i) => (
                            <FadeIn key={value.title} delay={i * 100}>
                                <Card className="h-full text-center">
                                    <div className="mx-auto mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                                        <value.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold">
                                        {value.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted">
                                        {value.description}
                                    </p>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Team */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <SectionHeader
                        label="Team"
                        title="The people behind Inkline"
                    />
                    <div className="grid gap-6 sm:grid-cols-2 max-w-xl mx-auto">
                        {TEAM.map((member, i) => (
                            <FadeIn key={member.name} delay={i * 100}>
                                <Card className="text-center">
                                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-light to-primary-dark text-2xl font-bold text-background">
                                        {member.name[0].toUpperCase()}
                                    </div>
                                    <h3 className="text-lg font-semibold">
                                        @{member.name}
                                    </h3>
                                    <p className="text-sm text-muted">
                                        {member.role}
                                    </p>
                                    <div className="mt-4 flex justify-center gap-3">
                                        <a
                                            href={member.github}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-muted hover:text-primary transition-colors"
                                        >
                                            GitHub
                                        </a>
                                        <span className="text-border">·</span>
                                        <span className="text-sm text-muted">
                                            {member.discord}
                                        </span>
                                    </div>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>

                    {/* Contributors */}
                    <FadeIn delay={200}>
                        <div className="mt-12 text-center">
                            <h3 className="text-lg font-semibold mb-4">
                                Contributors
                            </h3>
                            <a
                                href={`${GITHUB_REPO}/graphs/contributors`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src="https://contrib.rocks/image?repo=enxilium/inkline"
                                    alt="Inkline contributors"
                                    className="mx-auto"
                                />
                            </a>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Roadmap */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container size="md">
                    <SectionHeader
                        label="Roadmap"
                        title="What's next"
                        description="Features we're working on and planning for future releases."
                    />
                    <div className="grid gap-6 md:grid-cols-3">
                        {roadmap.map((item, i) => (
                            <FadeIn key={item.title} delay={i * 100}>
                                <Card className="h-full text-center">
                                    <div className="mx-auto mb-3 inline-flex rounded-lg bg-primary/10 p-2.5">
                                        <item.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-muted">
                                        {item.description}
                                    </p>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Open Source CTA */}
            <section className="py-16 md:py-24">
                <Container size="sm">
                    <FadeIn>
                        <div className="text-center">
                            <Users className="mx-auto h-10 w-10 text-primary mb-4" />
                            <h2 className="text-3xl font-bold">
                                Join the community
                            </h2>
                            <p className="mt-4 text-muted max-w-lg mx-auto">
                                Inkline is open-source and community-driven.
                                Contribute code, report bugs, suggest features,
                                or just star the repo.
                            </p>
                            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                <Button href={GITHUB_REPO} external>
                                    <Github className="h-4 w-4" />
                                    Star on GitHub
                                </Button>
                                <Button href="/contact" variant="secondary">
                                    Get in Touch
                                </Button>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </section>
        </>
    );
}
