import type { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import {
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
import { DownloadPlatforms } from "@/components/download/DownloadPlatforms";
import {
    DOWNLOADS,
    GITHUB_REPO,
    SITE_NAME,
    SITE_URL,
    getReleasesDataFromApi,
} from "@/lib/constants";

async function getBaseUrl(): Promise<string> {
    const requestHeaders = await headers();
    const forwardedHost = requestHeaders.get("x-forwarded-host");
    const host = forwardedHost ?? requestHeaders.get("host");

    if (!host) {
        return "http://localhost:3000";
    }

    const forwardedProto = requestHeaders.get("x-forwarded-proto");
    const protocol =
        forwardedProto ?? (host.includes("localhost") ? "http" : "https");

    return `${protocol}://${host}`;
}

export const metadata: Metadata = {
    title: "Download",
    description:
        "Download Inkline Studio for Windows, macOS, or Linux. Free and open-source, always.",
    alternates: {
        canonical: "/download",
    },
    openGraph: {
        title: `Download | ${SITE_NAME}`,
        description:
            "Download Inkline Studio for Windows, macOS, or Linux. Free and open-source, always.",
        url: "/download",
        type: "website",
        images: [{ url: "/images/download.png" }],
    },
    twitter: {
        card: "summary_large_image",
        title: `Download | ${SITE_NAME}`,
        description:
            "Download Inkline Studio for Windows, macOS, or Linux. Free and open-source, always.",
        images: ["/images/download.png"],
    },
};

export default async function DownloadPage() {
    const baseUrl = await getBaseUrl();
    const releaseData = await getReleasesDataFromApi(baseUrl);

    const platforms = [
        {
            key: "windows" as const,
            ...DOWNLOADS.windows,
        },
        {
            key: "macos" as const,
            ...DOWNLOADS.macos,
            url: releaseData.downloads.macosUrl,
            fileName: releaseData.downloads.macosFileName,
        },
        {
            key: "linux" as const,
            ...DOWNLOADS.linux,
            url: releaseData.downloads.linuxUrl,
            fileName: releaseData.downloads.linuxFileName,
        },
    ];

    const softwareSchema = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "WritingApplication",
        operatingSystem: "Windows, macOS, Linux",
        softwareVersion: releaseData.latestVersion,
        downloadUrl: platforms.map((platform) => platform.url),
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
        url: `${SITE_URL}/download`,
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(softwareSchema),
                }}
            />
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
                        <Badge className="mt-4">
                            {releaseData.latestVersion}
                        </Badge>
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
            <DownloadPlatforms platforms={platforms} />

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
                        {releaseData.changelog.length > 0 ? (
                            releaseData.changelog.map((release, i) => (
                                <FadeIn key={release.version} delay={i * 100}>
                                    <Card hover={false}>
                                        <div className="mb-4 flex flex-wrap items-center gap-3">
                                            <Badge>{release.version}</Badge>
                                            <span className="text-sm text-muted">
                                                {release.date}
                                            </span>
                                            <a
                                                href={release.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary hover:opacity-80"
                                            >
                                                Release notes
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        </div>
                                        <ul className="space-y-2">
                                            {release.changes.map((change) => (
                                                <li
                                                    key={`${release.version}-${change}`}
                                                    className="flex items-start gap-2 text-sm text-muted"
                                                >
                                                    <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                                    {change}
                                                </li>
                                            ))}
                                        </ul>
                                    </Card>
                                </FadeIn>
                            ))
                        ) : (
                            <FadeIn>
                                <Card hover={false}>
                                    <p className="text-sm text-muted">
                                        Changelog data is temporarily
                                        unavailable. Please check the full
                                        release history on GitHub.
                                    </p>
                                </Card>
                            </FadeIn>
                        )}
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
                                Inkline is open-source under the AGPL License.
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
