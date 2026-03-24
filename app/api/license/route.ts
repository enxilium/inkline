import { NextResponse } from "next/server";
import { PROJECT_LICENSE } from "@/lib/constants";

interface GitHubRepoResponse {
    license?: {
        spdx_id?: string | null;
        name?: string | null;
    } | null;
}

const REPO_API_URL = "https://api.github.com/repos/enxilium/inkline";

async function fetchRepoMetadata(): Promise<GitHubRepoResponse> {
    const headers: HeadersInit = {
        Accept: "application/vnd.github+json",
        "User-Agent": "inkline-website",
    };

    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
    }

    const response = await fetch(REPO_API_URL, { headers });

    if (!response.ok) {
        throw new Error(
            `Failed to load repository metadata: ${response.status}`,
        );
    }

    return (await response.json()) as GitHubRepoResponse;
}

export async function GET() {
    try {
        const repo = await fetchRepoMetadata();
        const license =
            repo.license?.spdx_id || repo.license?.name || PROJECT_LICENSE;

        return NextResponse.json({ license });
    } catch {
        return NextResponse.json({ license: PROJECT_LICENSE });
    }
}
