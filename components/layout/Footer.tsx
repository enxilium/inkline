import Link from "next/link";
import { Github } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { GITHUB_REPO, CURRENT_VERSION } from "@/lib/constants";

const footerLinks = {
    Product: [
        { label: "Features", href: "/features" },
        { label: "Download", href: "/download" },
        { label: "Changelog", href: `${GITHUB_REPO}/releases` },
    ],
    Resources: [
        { label: "GitHub", href: GITHUB_REPO },
        { label: "Issues", href: `${GITHUB_REPO}/issues` },
        { label: "Contributing", href: `${GITHUB_REPO}#contributing` },
    ],
    Company: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
    ],
};

export function Footer() {
    return (
        <footer className="border-t border-border bg-background">
            <Container className="py-16">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {/* Brand Column */}
                    <div className="col-span-2 md:col-span-1">
                        <Link
                            href="/"
                            className="text-lg font-bold tracking-wide"
                        >
                            <span className="gradient-text">INKLINE</span>
                        </Link>
                        <p className="mt-3 text-sm text-muted max-w-xs">
                            The free, open-source writing studio built by
                            writers, for writers.
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <a
                                href={GITHUB_REPO}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted transition-colors hover:text-foreground"
                                aria-label="GitHub"
                            >
                                <Github className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    {/* Link Columns */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h3 className="text-sm font-semibold text-foreground">
                                {title}
                            </h3>
                            <ul className="mt-4 space-y-3">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        {link.href.startsWith("http") ? (
                                            <a
                                                href={link.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm text-muted transition-colors hover:text-foreground"
                                            >
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link
                                                href={link.href}
                                                className="text-sm text-muted transition-colors hover:text-foreground"
                                            >
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom Bar */}
                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
                    <p className="text-xs text-muted">
                        &copy; {new Date().getFullYear()} Inkline Studio. MIT
                        License. {CURRENT_VERSION}
                    </p>
                    <p className="text-xs text-muted">
                        Made with care by{" "}
                        <a
                            href="https://github.com/enxilium"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            @enxilium
                        </a>{" "}
                        &{" "}
                        <a
                            href="https://github.com/sukdippa"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                        >
                            @sukdip
                        </a>
                    </p>
                </div>
            </Container>
        </footer>
    );
}
