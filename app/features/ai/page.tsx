import type { Metadata } from "next";
import Image from "next/image";
import {
    Sparkles,
    MessageSquare,
    Wand2,
    ImageIcon,
    Music,
    ListMusic,
    Shield,
    Cpu,
    Download,
    Eye,
    BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";

export const metadata: Metadata = {
    title: "AI Tools",
    description:
        "Inkline Studio's optional AI features — chat assistant, grammar checking, image generation, music generation, and playlist curation.",
};

const aiFeatures = [
    {
        icon: MessageSquare,
        title: "AI Chat Assistant",
        description:
            "Have context-aware conversations about your story. The assistant references your characters, locations, and organizations to give relevant feedback.",
        highlights: [
            "Multi-turn conversations with history",
            "Narrative context injection from your worldbuilding",
            "Per-project chat history persistence",
            "AI-generated conversation titles",
        ],
    },
    {
        icon: Wand2,
        title: "Grammar & Style",
        description:
            "Integrated LanguageTool provides real-time grammar, spelling, and style suggestions as you write — no AI key required.",
        highlights: [
            "Real-time feedback while typing",
            "Spelling and grammar corrections",
            "Style and clarity suggestions",
            "Works offline",
        ],
    },
    {
        icon: Eye,
        title: "AI Manuscript Editor",
        description:
            "Get comprehensive editorial comments and suggested replacements on full manuscripts — like having a professional editor on demand.",
        highlights: [
            "Chapter-level and range-level suggestions",
            "Word-position tracking for precise editing",
            "Custom analysis instructions",
            "Accept or reject each suggestion",
        ],
    },
];

const generationFeatures = [
    {
        icon: ImageIcon,
        title: "Image Generation",
        description:
            "Generate reference portraits for characters, landscapes for locations, and insignia for organizations — all from their descriptions.",
        tag: "Flux Model",
    },
    {
        icon: Music,
        title: "Music Generation",
        description:
            "Create thematic background music for characters, locations, and organizations that matches their personality and atmosphere.",
        tag: "ComfyUI",
    },
    {
        icon: ListMusic,
        title: "Playlist Curation",
        description:
            "AI curates Spotify and YouTube playlists to match each character, location, or organization — find the perfect soundtrack for your story.",
        tag: "Gemini AI",
    },
];

export default function AIPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="max-w-3xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="inline-flex rounded-xl bg-primary/10 p-3">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <Badge variant="outline">Optional</Badge>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            AI Tools
                        </h1>
                        <p className="mt-6 text-lg text-muted">
                            AI features that enhance your writing process —
                            never replace it. Every AI tool in Inkline is
                            optional and designed to be a helpful assistant, not
                            an author.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            {/* Philosophy Banner */}
            <section className="pb-16">
                <Container size="md">
                    <FadeIn>
                        <div className="flex items-start gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
                            <Shield className="h-6 w-6 shrink-0 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-semibold">
                                    Your words, your story
                                </h3>
                                <p className="mt-1 text-sm text-muted">
                                    Inkline&apos;s AI tools are designed to
                                    assist, not generate your story. They help
                                    with grammar, editing feedback, and
                                    reference asset creation. Every AI feature
                                    can be toggled on or off in settings.
                                </p>
                            </div>
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Writing AI Features */}
            <section className="py-16 md:py-24">
                <Container>
                    <SectionHeader
                        label="Writing Assistance"
                        title="Smarter editing, not automated writing"
                        description="AI tools that help you refine your craft — grammar checking, editorial feedback, and context-aware conversations."
                    />
                    <div className="space-y-8">
                        {aiFeatures.map((feature, i) => (
                            <FadeIn key={feature.title} delay={i * 100}>
                                <Card hover={false} className="p-8">
                                    <div className="grid gap-6 md:grid-cols-3">
                                        <div className="md:col-span-2">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="rounded-lg bg-primary/10 p-2">
                                                    <feature.icon className="h-5 w-5 text-primary" />
                                                </div>
                                                <h3 className="text-xl font-bold">
                                                    {feature.title}
                                                </h3>
                                            </div>
                                            <p className="text-muted">
                                                {feature.description}
                                            </p>
                                        </div>
                                        <div>
                                            <ul className="space-y-2">
                                                {feature.highlights.map((h) => (
                                                    <li
                                                        key={h}
                                                        className="flex items-start gap-2 text-sm"
                                                    >
                                                        <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                        <span className="text-muted">
                                                            {h}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Generation Features */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container>
                    <SectionHeader
                        label="Asset Generation"
                        title="Create reference assets from scratch"
                        description="Generate images, music, and playlists based on your character, location, and organization descriptions."
                    />
                    <div className="grid gap-6 md:grid-cols-3">
                        {generationFeatures.map((feature, i) => (
                            <FadeIn key={feature.title} delay={i * 100}>
                                <Card className="h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="rounded-lg bg-primary/10 p-2.5">
                                            <feature.icon className="h-5 w-5 text-primary" />
                                        </div>
                                        <Badge variant="outline">
                                            {feature.tag}
                                        </Badge>
                                    </div>
                                    <h3 className="text-lg font-semibold">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted">
                                        {feature.description}
                                    </p>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Local AI */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <FadeIn>
                        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-primary-dark/5 p-8 md:p-12">
                            <div className="flex items-center gap-3 mb-4">
                                <Cpu className="h-6 w-6 text-primary" />
                                <h2 className="text-2xl font-bold">
                                    Local AI Processing
                                </h2>
                            </div>
                            <p className="text-muted max-w-2xl">
                                Inkline supports running image and audio
                                generation locally on your machine via ComfyUI —
                                no cloud APIs needed. Your data stays on your
                                computer. Currently available on Windows with a
                                dedicated GPU.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Badge>Privacy-First</Badge>
                                <Badge>No API Keys Required</Badge>
                                <Badge>GPU Accelerated</Badge>
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
                                Try the AI tools
                            </h2>
                            <p className="mt-4 text-muted">
                                Download Inkline and explore the optional AI
                                features — or turn them off entirely. It&apos;s
                                your choice.
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
