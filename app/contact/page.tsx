"use client";

import { useState, type FormEvent } from "react";
import {
    MessageSquare,
    Github,
    Mail,
    ChevronDown,
    ExternalLink,
    Send,
    Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { FadeIn } from "@/components/ui/FadeIn";
import { GITHUB_REPO } from "@/lib/constants";

const contactMethods = [
    {
        icon: MessageSquare,
        title: "Discord",
        description: "Join our community and chat with the team directly.",
        detail: "Reach us at enxil. or sukdip on Discord",
        href: "https://discord.gg/inkline",
        cta: "Join Discord",
    },
    {
        icon: Github,
        title: "GitHub Issues",
        description:
            "Report bugs, request features, or browse existing issues.",
        detail: "Best for technical feedback and feature requests",
        href: `${GITHUB_REPO}/issues`,
        cta: "Open an Issue",
    },
    {
        icon: Mail,
        title: "Email",
        description: "For partnerships, press inquiries, or anything else.",
        detail: "We'll get back to you as soon as we can",
        href: "mailto:jace.zk.dev@gmail.com",
        cta: "Send Email",
    },
];

const faqs = [
    {
        question: "Is Inkline really free?",
        answer: "Yes — completely free, forever. Inkline is open-source under the AGPL-3.0 License. There are no premium tiers, no feature gates, and no subscriptions.",
    },
    {
        question: "Where is my data stored?",
        answer: "By default, your data is stored locally on your machine. If you enable cloud sync, your data is stored securely in the cloud database — but local storage always remains available.",
    },
    {
        question: "Can I use Inkline offline?",
        answer: "Yes. Inkline is built with a local-first architecture. You can write, edit, and manage your projects entirely offline, and sync when you're ready.",
    },
    {
        question: "Do I need an AI API key?",
        answer: "AI features are optional. Grammar checking works offline. For AI chat and generation features, you'll need a Gemini API key (free tier available).",
    },
    {
        question: "What formats can I export to?",
        answer: "Currently, Inkline supports EPUB export. PDF and additional formats are planned for future releases.",
    },
    {
        question: "How do I report a bug?",
        answer: "The best way is to fill out the form on the contact page. For technical issues, providing details about your operating system, steps to reproduce, and screenshots can help us resolve the issue and also get back to you faster.",
    },
];

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setSubmitError(null);

        const payload = {
            name: String(formData.get("name") ?? ""),
            email: String(formData.get("email") ?? ""),
            subject: String(formData.get("subject") ?? ""),
            message: String(formData.get("message") ?? ""),
            company: String(formData.get("company") ?? ""),
        };

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = (await response.json().catch(() => null)) as {
                ok?: boolean;
                error?: string;
            } | null;

            if (!response.ok || !result?.ok) {
                setSubmitError(
                    result?.error ||
                        "Unable to send your message right now. Please try again.",
                );
                return;
            }

            setSubmitted(true);
            form.reset();
        } catch {
            setSubmitError(
                "Unable to send your message right now. Please try again.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            {/* Hero */}
            <section className="relative overflow-hidden py-20 md:py-28">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
                <Container className="relative">
                    <FadeIn className="text-center">
                        <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
                            Get in <span className="gradient-text">touch</span>
                        </h1>
                        <p className="mt-6 mx-auto max-w-2xl text-lg text-muted">
                            Have a question, found a bug, or want to contribute?
                            We&apos;d love to hear from you.
                        </p>
                    </FadeIn>
                </Container>
            </section>

            {/* Contact Methods */}
            <section className="pb-16 md:pb-24">
                <Container>
                    <div className="grid gap-6 md:grid-cols-3">
                        {contactMethods.map((method, i) => (
                            <FadeIn key={method.title} delay={i * 100}>
                                <Card className="h-full flex flex-col">
                                    <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3 self-start">
                                        <method.icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <h3 className="text-lg font-semibold">
                                        {method.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted flex-1">
                                        {method.description}
                                    </p>
                                    <p className="mt-2 text-xs text-muted">
                                        {method.detail}
                                    </p>
                                    <div className="mt-4">
                                        <Button
                                            href={method.href}
                                            variant="secondary"
                                            size="sm"
                                            external
                                        >
                                            {method.cta}
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </Card>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>

            {/* Contact Form */}
            <section className="py-16 md:py-24 bg-card/50">
                <Container size="sm">
                    <SectionHeader
                        title="Send us a message"
                        description="Fill out the form below and we'll get back to you."
                    />
                    <FadeIn>
                        {submitted ? (
                            <Card hover={false} className="text-center py-12">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                                    <Check className="h-6 w-6 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold">
                                    Message sent
                                </h3>
                                <p className="mt-2 text-muted">
                                    Thanks for reaching out. We received your
                                    message and will get back to you soon.
                                </p>
                            </Card>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="hidden" aria-hidden="true">
                                    <label htmlFor="company">Company</label>
                                    <input
                                        id="company"
                                        name="company"
                                        type="text"
                                        autoComplete="off"
                                        tabIndex={-1}
                                    />
                                </div>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div>
                                        <label
                                            htmlFor="name"
                                            className="block text-sm font-medium mb-2"
                                        >
                                            Name
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            type="text"
                                            required
                                            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                            placeholder="Your name"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-medium mb-2"
                                        >
                                            Email
                                        </label>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            required
                                            className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label
                                        htmlFor="subject"
                                        className="block text-sm font-medium mb-2"
                                    >
                                        Subject
                                    </label>
                                    <select
                                        id="subject"
                                        name="subject"
                                        required
                                        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                                    >
                                        <option value="">Select a topic</option>
                                        <option value="Bug Report">
                                            Bug Report
                                        </option>
                                        <option value="Feature Request">
                                            Feature Request
                                        </option>
                                        <option value="General Inquiry">
                                            General Inquiry
                                        </option>
                                        <option value="Partnership">
                                            Partnership
                                        </option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label
                                        htmlFor="message"
                                        className="block text-sm font-medium mb-2"
                                    >
                                        Message
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        required
                                        rows={6}
                                        className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors resize-none"
                                        placeholder="Tell us what's on your mind..."
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full sm:w-auto"
                                    disabled={isSubmitting}
                                >
                                    <Send className="h-4 w-4" />
                                    {isSubmitting
                                        ? "Sending..."
                                        : "Send Message"}
                                </Button>
                                {submitError && (
                                    <p className="text-sm text-destructive">
                                        {submitError}
                                    </p>
                                )}
                            </form>
                        )}
                    </FadeIn>
                </Container>
            </section>

            {/* FAQ */}
            <section className="py-16 md:py-24">
                <Container size="sm">
                    <SectionHeader
                        label="FAQ"
                        title="Frequently asked questions"
                    />
                    <div className="space-y-3">
                        {faqs.map((faq, i) => (
                            <FadeIn key={faq.question} delay={i * 50}>
                                <button
                                    onClick={() =>
                                        setExpandedFaq(
                                            expandedFaq === i ? null : i,
                                        )
                                    }
                                    className="w-full rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/30 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <h3 className="font-medium">
                                            {faq.question}
                                        </h3>
                                        <ChevronDown
                                            className={`h-5 w-5 shrink-0 text-muted transition-transform ${
                                                expandedFaq === i
                                                    ? "rotate-180"
                                                    : ""
                                            }`}
                                        />
                                    </div>
                                    {expandedFaq === i && (
                                        <p className="mt-3 text-sm text-muted">
                                            {faq.answer}
                                        </p>
                                    )}
                                </button>
                            </FadeIn>
                        ))}
                    </div>
                </Container>
            </section>
        </>
    );
}
