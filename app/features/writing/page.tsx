import type { Metadata } from "next";
import Image from "next/image";
import {
    PenTool,
    BookOpen,
    FileDown,
    Import,
    Wand2,
    Search,
    Type,
    List,
    AlignLeft,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";

export const metadata: Metadata = {
    title: "Writing & Editing",
    description:
        "Inkline Studio offers a distraction-free rich text editor with chapter management, grammar checking, EPUB export, and one-click import.",
};

const editorFeatures = [
    {
        icon: Type,
        title: "Rich Formatting",
        description:
            "Bold, italic, underline, strike-through, headings, and more.",
    },
    {
        icon: List,
        title: "Lists & Blocks",
        description:
            "Ordered and unordered lists, blockquotes, and code blocks.",
    },
    {
        icon: AlignLeft,
        title: "Clean Typography",
        description:
            "Customizable fonts and font sizes for comfortable writing.",
    },
    {
        icon: Search,
        title: "Search & Replace",
        description: "Find and replace across your entire manuscript.",
    },
];

const managementFeatures = [
    {
        icon: BookOpen,
        title: "Chapter Management",
        description:
            "Create, rename, reorder, and delete chapters with drag-and-drop. Your manuscript structure is always just a click away.",
    },
    {
        icon: PenTool,
        title: "Scrap Notes",
        description:
            "Keep supplemental documents for lore sheets, character clues, world details, or any notes that support your story.",
    },
    {
        icon: Wand2,
        title: "Grammar & Spell Check",
        description:
            "Real-time grammar and spelling feedback. Smarter than your average spellcheck, with suggestions for improving clarity and style.",
    },
    {
        icon: FileDown,
        title: "EPUB Export",
        description:
            "Export your finished manuscript to industry-standard EPUB format with a single click — ready for distribution.",
    },
    {
        icon: Import,
        title: "One-Click Import",
        description:
            "Bring in your existing work from Google Docs, Microsoft Word, and other document formats effortlessly.",
    },
];

export default function WritingPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="max-w-3xl">
                        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                            <PenTool className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Writing & Editing
                        </h1>
                        <p className="mt-6 text-lg text-muted">
                            A distraction-free writing environment designed to
                            keep you in flow. Rich text editing, chapter
                            management, grammar checking, and one-click export —
                            everything a writer needs.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            {/* Screenshot Showcase */}
            <section className="pb-16">
                <Container>
                    <FadeIn>
                        <div className="overflow-hidden rounded-2xl border border-border glow">
                            <Image
                                src="/images/features-minimal-interface.png"
                                alt="Inkline Studio writing interface"
                                width={1400}
                                height={900}
                                className="w-full"
                                priority
                            />
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Editor Features */}
            <section className="py-16 md:py-24">
                <Container>
                    <SectionHeader
                        label="Editor"
                        title="A powerful editor that feels effortless"
                        description="Built on Tiptap, Inkline's editor gives you full control without getting in your way."
                        align="left"
                    />
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {editorFeatures.map((feature, i) => (
                            <FadeIn key={feature.title} delay={i * 75}>
                                <Card className="h-full text-center">
                                    <div className="mx-auto mb-3 inline-flex rounded-lg bg-primary/10 p-2.5">
                                        <feature.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-1.5 text-sm text-muted">
                                        {feature.description}
                                    </p>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Management & Tools */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container>
                    <SectionHeader
                        label="Tools"
                        title="Everything around the writing"
                        description="Manage your manuscript structure, check your grammar, and export when you're ready."
                    />
                    <div className="space-y-6">
                        {managementFeatures.map((feature, i) => (
                            <FadeIn key={feature.title} delay={i * 75}>
                                <Card className="flex items-start gap-5">
                                    <div className="shrink-0 rounded-xl bg-primary/10 p-3">
                                        <feature.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold">
                                            {feature.title}
                                        </h3>
                                        <p className="mt-1 text-muted">
                                            {feature.description}
                                        </p>
                                    </div>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* CTA */}
            <section className="py-16 md:py-24">
                <Container size="sm">
                    <FadeIn>
                        <div className="text-center">
                            <h2 className="text-3xl font-bold">
                                Start writing today
                            </h2>
                            <p className="mt-4 text-muted">
                                Download Inkline Studio and focus on what
                                matters — your story.
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
