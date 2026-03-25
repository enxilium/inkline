"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Apple, Copy, Download, Monitor, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/ui/FadeIn";
import { cn } from "@/lib/utils";

export type PlatformKey = "windows" | "macos" | "linux";

type DetectedOS = PlatformKey | "unknown";

interface Platform {
    key: PlatformKey;
    label: string;
    description: string;
    fileName: string;
    url: string;
}

interface DownloadPlatformsProps {
    platforms: Platform[];
}

const MACOS_QUARANTINE_COMMAND = "xattr -dr com.apple.quarantine .";

function detectOS(): DetectedOS {
    if (typeof window === "undefined") {
        return "unknown";
    }

    const ua = navigator.userAgent.toLowerCase();
    const platform = (navigator.platform || "").toLowerCase();

    if (ua.includes("mac os") || platform.includes("mac")) {
        return "macos";
    }

    if (ua.includes("win") || platform.includes("win")) {
        return "windows";
    }

    if (
        ua.includes("linux") ||
        platform.includes("linux") ||
        ua.includes("x11")
    ) {
        return "linux";
    }

    return "unknown";
}

function PlatformIcon({ platformKey }: { platformKey: PlatformKey }) {
    if (platformKey === "macos") {
        return <Apple className="h-8 w-8 text-primary" />;
    }

    if (platformKey === "linux") {
        return <Terminal className="h-8 w-8 text-primary" />;
    }

    return <Monitor className="h-8 w-8 text-primary" />;
}

export function DownloadPlatforms({ platforms }: DownloadPlatformsProps) {
    const [detectedOS, setDetectedOS] = useState<DetectedOS>("unknown");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setDetectedOS(detectOS());
    }, []);

    const sortedPlatforms = useMemo(() => {
        if (detectedOS === "unknown") {
            return platforms;
        }

        return [...platforms].sort((a, b) => {
            if (a.key === detectedOS) {
                return -1;
            }

            if (b.key === detectedOS) {
                return 1;
            }

            return 0;
        });
    }, [detectedOS, platforms]);

    const showMacWarning = detectedOS === "macos";

    const handleCopyCommand = async () => {
        try {
            await navigator.clipboard.writeText(MACOS_QUARANTINE_COMMAND);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    return (
        <>
            <section className="py-16 md:py-24">
                <Container size="md">
                    <div className="grid gap-6 md:grid-cols-3">
                        {sortedPlatforms.map((platform, i) => {
                            const isRecommended = platform.key === detectedOS;

                            return (
                                <FadeIn key={platform.key} delay={i * 100}>
                                    <Card
                                        className={cn(
                                            "flex h-full flex-col items-center p-8 text-center",
                                            isRecommended &&
                                                "border-primary/60 bg-primary/5",
                                        )}
                                    >
                                        <div className="mb-4 rounded-2xl bg-primary/10 p-4">
                                            <PlatformIcon
                                                platformKey={platform.key}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-xl font-bold">
                                                {platform.label}
                                            </h3>
                                            {isRecommended && (
                                                <Badge className="text-[10px]">
                                                    Detected
                                                </Badge>
                                            )}
                                        </div>
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
                            );
                        })}
                    </div>
                </Container>
            </section>

            {showMacWarning && (
                <section className="pb-16 md:pb-24">
                    <Container size="md">
                        <FadeIn>
                            <Card
                                hover={false}
                                className="border-amber-500/40 bg-amber-500/5"
                            >
                                <Badge className="bg-amber-500/15 text-amber-200">
                                    Important for macOS users
                                </Badge>
                                <p className="mt-4 text-sm text-muted">
                                    Due to financial constraints, we have opted
                                    to not pay for the Apple Developer program
                                    at this time, which means you will get an
                                    error when trying to open Inkline after
                                    first installing. To mitigate this for the
                                    time being, follow these steps:
                                </p>
                                <ol className="mt-4 list-decimal space-y-4 pl-5 text-sm text-muted">
                                    <li>
                                        Navigate to your Applications directory,
                                        right-click Inkline, and click the New
                                        Terminal at Folder button.
                                    </li>
                                    <li>
                                        In the new window that opens up, paste
                                        this command:
                                        <div className="mt-3 rounded-xl border border-border bg-background px-4 py-3 font-mono text-xs text-foreground">
                                            {MACOS_QUARANTINE_COMMAND}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCopyCommand}
                                            className="mt-2 inline-flex items-center gap-2 text-xs text-primary transition-opacity hover:opacity-80"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            {copied ? "Copied" : "Copy command"}
                                        </button>
                                    </li>
                                </ol>
                                <div className="mt-6 overflow-hidden rounded-xl border border-border">
                                    <Image
                                        src="/images/mac-warning.png"
                                        alt="Finder context menu showing the New Terminal at Folder option for Inkline in Applications"
                                        width={1600}
                                        height={1000}
                                        className="w-full"
                                    />
                                </div>
                            </Card>
                        </FadeIn>
                    </Container>
                </section>
            )}
        </>
    );
}
