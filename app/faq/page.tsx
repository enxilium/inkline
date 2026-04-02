import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { FadeIn } from "@/components/ui/FadeIn";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { SITE_NAME } from "@/lib/constants";
import { FAQS } from "@/lib/faqs";

export const metadata: Metadata = {
    title: "FAQ",
    description:
        "Find answers to common Inkline Studio questions about pricing, offline usage, AI features, sync, exports, and support.",
    alternates: {
        canonical: "/faq",
    },
    openGraph: {
        title: `${SITE_NAME} FAQ`,
        description:
            "Find answers to common Inkline Studio questions about pricing, offline usage, AI features, sync, exports, and support.",
        url: "/faq",
        type: "website",
        images: [{ url: "/images/banner.png" }],
    },
    twitter: {
        card: "summary_large_image",
        title: `${SITE_NAME} FAQ`,
        description:
            "Find answers to common Inkline Studio questions about pricing, offline usage, AI features, sync, exports, and support.",
        images: ["/images/banner.png"],
    },
};

export default function FaqPage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: FAQS.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: faq.answer,
            },
        })),
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(faqSchema),
                }}
            />
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="max-w-3xl mx-auto text-center">
                        <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
                            <HelpCircle className="h-6 w-6 text-primary" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Frequently asked questions
                        </h1>
                        <p className="mt-6 text-lg text-muted">
                            Quick answers about pricing, sync, AI usage,
                            exporting, and support.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            <section className="pb-16 md:pb-24">
                <Container size="md">
                    <SectionHeader
                        label="Support"
                        title="Everything you need before getting started"
                    />
                    <div className="space-y-4">
                        {FAQS.map((faq, i) => (
                            <FadeIn key={faq.question} delay={i * 50}>
                                <Card hover={false}>
                                    <h2 className="text-lg font-semibold">
                                        {faq.question}
                                    </h2>
                                    <p className="mt-2 text-sm text-muted">
                                        {faq.answer}
                                    </p>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                    <FadeIn delay={150}>
                        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                            <Button href="/download">
                                Download for Free
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button href="/contact" variant="secondary">
                                Contact Support
                            </Button>
                        </div>
                    </FadeIn>
                    <FadeIn delay={200}>
                        <p className="mt-6 text-center text-sm text-muted">
                            Looking for technical reports? Open an issue on{" "}
                            <Link
                                href="https://github.com/enxilium/inkline/issues"
                                className="text-primary hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                GitHub
                            </Link>
                            .
                        </p>
                    </FadeIn>
                </Container>
            </section>
        </>
    );
}
