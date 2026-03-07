"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function Header() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [featuresOpen, setFeaturesOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        document.body.style.overflow = mobileOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [mobileOpen]);

    return (
        <header
            className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
                scrolled
                    ? "border-b border-border bg-background/80 backdrop-blur-xl"
                    : "bg-transparent",
            )}
        >
            <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
                {/* Logo */}
                <Link
                    href="/"
                    className="flex items-center gap-2 text-lg font-bold tracking-wide"
                >
                    <span className="gradient-text">INKLINE</span>
                    <span className="text-muted text-sm font-normal hidden sm:inline">
                        STUDIO
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden items-center gap-8 md:flex">
                    {NAV_LINKS.map((link) =>
                        "children" in link && link.children ? (
                            <div
                                key={link.label}
                                className="relative"
                                onMouseEnter={() => setFeaturesOpen(true)}
                                onMouseLeave={() => setFeaturesOpen(false)}
                            >
                                <Link
                                    href={link.href}
                                    className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
                                >
                                    {link.label}
                                    <ChevronDown className="h-3.5 w-3.5" />
                                </Link>
                                {featuresOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-56 rounded-xl border border-border bg-elevated p-2 shadow-xl">
                                        {link.children.map((child) => (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className="block rounded-lg px-4 py-2.5 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
                                            >
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="text-sm text-muted transition-colors hover:text-foreground"
                            >
                                {link.label}
                            </Link>
                        ),
                    )}
                    <Button href="/download" size="sm">
                        Download Free
                    </Button>
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden text-foreground cursor-pointer"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Toggle menu"
                >
                    {mobileOpen ? (
                        <X className="h-6 w-6" />
                    ) : (
                        <Menu className="h-6 w-6" />
                    )}
                </button>
            </nav>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 top-[65px] z-40 bg-background/95 backdrop-blur-xl md:hidden">
                    <div className="flex flex-col gap-1 p-6">
                        {NAV_LINKS.map((link) => (
                            <div key={link.label}>
                                <Link
                                    href={link.href}
                                    className="block rounded-lg px-4 py-3 text-lg font-medium text-foreground transition-colors hover:bg-card"
                                    onClick={() => setMobileOpen(false)}
                                >
                                    {link.label}
                                </Link>
                                {"children" in link &&
                                    link.children?.map((child) => (
                                        <Link
                                            key={child.href}
                                            href={child.href}
                                            className="block rounded-lg px-8 py-2.5 text-sm text-muted transition-colors hover:bg-card hover:text-foreground"
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            {child.label}
                                        </Link>
                                    ))}
                            </div>
                        ))}
                        <div className="mt-4 px-4">
                            <Button href="/download" className="w-full">
                                Download Free
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
