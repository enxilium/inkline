import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    return [
        {
            url: SITE_URL,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 1,
        },
        {
            url: `${SITE_URL}/download`,
            lastModified: now,
            changeFrequency: "daily",
            priority: 0.95,
        },
        {
            url: `${SITE_URL}/features`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/features/writing`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.85,
        },
        {
            url: `${SITE_URL}/features/worldbuilding`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.85,
        },
        {
            url: `${SITE_URL}/features/ai`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.85,
        },
        {
            url: `${SITE_URL}/features/sync-export`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.85,
        },
        {
            url: `${SITE_URL}/about`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${SITE_URL}/contact`,
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${SITE_URL}/faq`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.8,
        },
    ];
}
