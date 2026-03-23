import type { Metadata } from "next";
import Image from "next/image";
import {
    ArrowUpDown,
    Cloud,
    FileDown,
    Import,
    Shield,
    Laptop,
    Smartphone,
    FileCheck,
    Download,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";

export const metadata: Metadata = {
    title: "Sync & Export",
    description:
        "Keep projects in sync across devices, export polished EPUB files, and import existing drafts from tools like Google Docs and Word.",
};

const workflowFeatures = [
    {
        icon: Cloud,
        title: "Cloud Sync",
        description:
            "Keep your projects aligned across devices with secure sync while preserving local-first workflows.",
    },
    {
        icon: FileDown,
        title: "EPUB Export",
        description:
            "Export your manuscript to standard EPUB format with clean structure and chapter ordering.",
    },
    {
        icon: Import,
        title: "One-Click Import",
        description:
            "Bring in drafts from Google Docs, Microsoft Word, and other document sources in seconds.",
    },
];

const portabilityFeatures = [
    {
        icon: Laptop,
        title: "Desktop-First Experience",
        description:
            "Write and manage projects on your primary machine with fast local performance.",
    },
    {
        icon: Smartphone,
        title: "Cross-Device Continuity",
        description:
            "Resume where you left off by syncing your latest project state between devices.",
    },
    {
        icon: FileCheck,
        title: "Structured Project Data",
        description:
            "Projects stay organized so imports, edits, and exports remain predictable and safe.",
    },
];

export default function SyncExportPage() {
    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="max-w-3xl">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="inline-flex rounded-xl bg-primary/10 p-3">
                                <ArrowUpDown className="h-6 w-6 text-primary" />
                            </div>
                            <Badge variant="outline">Workflow</Badge>
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Sync & Export
                        </h1>
                        <p className="mt-6 text-lg text-muted">
                            Move your manuscript smoothly from first draft to
                            final file. Sync across devices, import existing
                            drafts, and export publication-ready EPUBs without
                            breaking your writing flow.
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
                                src="/images/features-import.png"
                                alt="Inkline Studio sync and export workflow"
                                width={1920}
                                height={1080}
                                className="w-full"
                                priority
                            />
                        </div>
                    </FadeIn>
                </Container>
            </section>

            {/* Workflow Features */}
            <section className="py-16 md:py-24">
                <Container>
                    <SectionHeader
                        label="Workflow"
                        title="Everything between draft and delivery"
                        description="Designed to help you import existing work, keep progress in sync, and export clean results when you are ready."
                    />
                    <div className="grid gap-6 md:grid-cols-3">
                        {workflowFeatures.map((feature, i) => (
                            <FadeIn key={feature.title} delay={i * 100}>
                                <Card className="h-full">
                                    <div className="rounded-lg bg-primary/10 p-2.5 inline-flex mb-4">
                                        <feature.icon className="h-5 w-5 text-primary" />
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

            {/* Portability */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container>
                    <SectionHeader
                        label="Portability"
                        title="Write anywhere, ship anywhere"
                        description="Whether you are drafting on one device or finalizing on another, Inkline keeps your process connected."
                    />
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {portabilityFeatures.map((feature, i) => (
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

            {/* Trust */}
            <section className="py-16 md:py-24">
                <Container size="md">
                    <FadeIn>
                        <div className="rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-primary-dark/5 p-8 md:p-12">
                            <div className="flex items-center gap-3 mb-4">
                                <Shield className="h-6 w-6 text-primary" />
                                <h2 className="text-2xl font-bold">
                                    Local-first by design
                                </h2>
                            </div>
                            <p className="text-muted max-w-2xl">
                                Your writing workflow stays resilient because
                                Inkline is built around local project data, with
                                sync and export capabilities layered in to help
                                you collaborate and publish on your terms.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Badge>Local Storage</Badge>
                                <Badge>Secure Sync</Badge>
                                <Badge>Standards-Based Export</Badge>
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
                                Keep writing without friction
                            </h2>
                            <p className="mt-4 text-muted">
                                Download Inkline Studio and move from import to
                                sync to export in one continuous flow.
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