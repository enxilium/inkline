import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SITE_NAME, SITE_DESCRIPTION, SITE_URL } from "@/lib/constants";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: `${SITE_NAME} — Every story starts with a single stroke`,
        template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    alternates: {
        canonical: "/",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
        },
    },
    openGraph: {
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: SITE_URL,
        siteName: SITE_NAME,
        locale: "en_US",
        type: "website",
        images: [{ url: "/images/banner.png" }],
    },
    twitter: {
        card: "summary_large_image",
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        images: ["/images/banner.png"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Header />
                <main className="min-h-screen pt-[65px]">{children}</main>
                <Footer />
            </body>
        </html>
    );
}
