import { NextResponse } from "next/server";
import { CURRENT_VERSION, GITHUB_REPO, DOWNLOADS } from "@/lib/constants";

interface GitHubReleaseAsset {
    name: string;
    browser_download_url: string;
}

interface GitHubRelease {
    html_url: string;
    tag_name: string;
    published_at: string;
    body: string | null;
    draft: boolean;
    prerelease: boolean;
    assets: GitHubReleaseAsset[];
}

interface ReleaseEntry {
    version: string;
    date: string;
    changes: string[];
    url: string;
}

const RELEASES_API_URL =
    "https://api.github.com/repos/enxilium/inkline/releases";
const CHANGELOG_LIMIT = 5;

function toStableReleases(releases: GitHubRelease[]): GitHubRelease[] {
    return releases.filter((release) => !release.draft && !release.prerelease);
}

function findAssetUrl(
    assets: GitHubReleaseAsset[],
    matcher: (asset: GitHubReleaseAsset) => boolean,
): string | null {
    const match = assets.find(matcher);
    return match ? match.browser_download_url : null;
}

function parseReleaseBody(body: string | null): string[] {
    if (!body) {
        return ["See release notes on GitHub."];
    }

    const lines = body
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

    const markdownBullets = lines
        .filter((line) => /^[-*+]\s+/.test(line))
        .map((line) => line.replace(/^[-*+]\s+/, "").trim())
        .filter(Boolean);

    if (markdownBullets.length > 0) {
        return markdownBullets;
    }

    const plainLines = lines
        .filter((line) => !line.startsWith("#"))
        .filter((line) => !line.startsWith("```"))
        .slice(0, 8);

    return plainLines.length > 0
        ? plainLines
        : ["See release notes on GitHub."];
}

function formatReleaseDate(isoDate: string): string {
    const publishedDate = new Date(isoDate);

    if (Number.isNaN(publishedDate.getTime())) {
        return "Unknown date";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
    }).format(publishedDate);
}

function getFallbackPayload() {
    return {
        latestVersion: CURRENT_VERSION,
        downloads: {
            macosUrl: DOWNLOADS.macos.url,
            macosFileName: DOWNLOADS.macos.fileName,
            linuxUrl: DOWNLOADS.linux.url,
            linuxFileName: DOWNLOADS.linux.fileName,
        },
        changelog: [] as ReleaseEntry[],
        releasesUrl: `${GITHUB_REPO}/releases`,
    };
}

async function fetchStableReleases(): Promise<GitHubRelease[]> {
    const headers: HeadersInit = {
        Accept: "application/vnd.github+json",
        "User-Agent": "inkline-website",
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
    }

    const response = await fetch(RELEASES_API_URL, { headers });

    if (!response.ok) {
        throw new Error(`Failed to load releases: ${response.status}`);
    }

    const releases = (await response.json()) as GitHubRelease[];
    return toStableReleases(releases);
}

export async function GET() {
    const fallback = getFallbackPayload();

    try {
        const releases = await fetchStableReleases();
        const latestRelease = releases[0];

        if (!latestRelease) {
            return NextResponse.json(fallback);
        }

        const macosUrl =
            findAssetUrl(latestRelease.assets, (asset) =>
                /\.dmg$/i.test(asset.name),
            ) ?? fallback.downloads.macosUrl;

        const linuxUrl =
            findAssetUrl(latestRelease.assets, (asset) =>
                /\.deb$/i.test(asset.name),
            ) ?? fallback.downloads.linuxUrl;

        const macosFileName =
            latestRelease.assets.find((asset) => /\.dmg$/i.test(asset.name))
                ?.name ?? fallback.downloads.macosFileName;

        const linuxFileName =
            latestRelease.assets.find((asset) => /\.deb$/i.test(asset.name))
                ?.name ?? fallback.downloads.linuxFileName;

        const changelog = releases.slice(0, CHANGELOG_LIMIT).map((release) => ({
            version: release.tag_name,
            date: formatReleaseDate(release.published_at),
            changes: parseReleaseBody(release.body),
            url: release.html_url,
        }));

        return NextResponse.json({
            latestVersion: latestRelease.tag_name,
            downloads: { macosUrl, macosFileName, linuxUrl, linuxFileName },
            changelog,
            releasesUrl: fallback.releasesUrl,
        });
    } catch {
        return NextResponse.json(fallback);
    }
}
