import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
    title: "Contact",
    description:
        "Contact the Inkline Studio team for support, feedback, bug reports, or partnership inquiries.",
    alternates: {
        canonical: "/contact",
    },
    openGraph: {
        title: `Contact | ${SITE_NAME}`,
        description:
            "Contact the Inkline Studio team for support, feedback, bug reports, or partnership inquiries.",
        url: "/contact",
        type: "website",
        images: [{ url: "/images/banner.png" }],
    },
    twitter: {
        card: "summary_large_image",
        title: `Contact | ${SITE_NAME}`,
        description:
            "Contact the Inkline Studio team for support, feedback, bug reports, or partnership inquiries.",
        images: ["/images/banner.png"],
    },
};

export default function ContactLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
