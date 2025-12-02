import { Character } from "../../@core/domain/entities/story/world/Character";
import { Location } from "../../@core/domain/entities/story/world/Location";
import { Organization } from "../../@core/domain/entities/story/world/Organization";
import { IPlaylistGenerationService } from "../../@core/domain/services/IPlaylistGenerationService";
import { Playlist } from "../../@core/domain/entities/story/world/Playlist";
import { IUserSessionStore } from "../../@core/domain/services/IUserSessionStore";
import { ILocationRepository } from "../../@core/domain/repositories/ILocationRepository";
import { GoogleGenAI, Type, Tool, Part } from "@google/genai";
import { generateId } from "../../@core/application/utils/id";

interface YouTubeVideo {
    id: string;
    title: string;
    channel: string;
    description: string;
}

interface SearchResult {
    query: string;
    results?: YouTubeVideo[];
    error?: string;
}

interface FinalizedTrack {
    id: string;
    title: string;
    artist: string;
    reason?: string;
}

export class PlaylistGenerationService implements IPlaylistGenerationService {
    private sessionStore: IUserSessionStore;
    private locationRepository: ILocationRepository;
    private genAI: GoogleGenAI | null = null;
    private readonly YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";

    constructor(
        sessionStore: IUserSessionStore,
        locationRepository: ILocationRepository
    ) {
        this.sessionStore = sessionStore;
        this.locationRepository = locationRepository;
    }

    private async getGeminiClient(): Promise<GoogleGenAI> {
        if (this.genAI) {
            return this.genAI;
        }

        const user = await this.sessionStore.load();
        const key = user?.preferences.geminiApiKey
            ? user.preferences.geminiApiKey
            : process.env.GEMINI_API_KEY;

        if (!key) {
            throw new Error(
                "Gemini API Key is missing. Please add it in Settings."
            );
        }

        this.genAI = new GoogleGenAI({ apiKey: key });
        return this.genAI;
    }

    private async buildSubjectDescription(
        subject: Character | Location | Organization
    ): Promise<string> {
        let description = `Type: ${subject.constructor.name}\nName: ${subject.name}\nDescription: ${subject.description}`;

        if (subject instanceof Character) {
            description += `\nRace: ${subject.race || "Unknown"}`;
            if (subject.age) {
                description += `\nAge: ${subject.age}`;
            }

            if (subject.currentLocationId) {
                const location = await this.locationRepository.findById(
                    subject.currentLocationId
                );
                if (location) {
                    description += `\nCurrent Location (Background): ${location.name} - ${location.description}`;
                }
            }
        }

        return description;
    }

    private async searchYoutube(queries: string[]): Promise<SearchResult[]> {
        const allResults: SearchResult[] = [];

        for (const query of queries) {
            try {
                const url = new URL(
                    "https://www.googleapis.com/youtube/v3/search"
                );
                url.searchParams.append("part", "snippet");
                url.searchParams.append("q", query);
                url.searchParams.append("type", "video");
                url.searchParams.append("maxResults", "5");
                url.searchParams.append("key", this.YOUTUBE_API_KEY);

                const response = await fetch(url.toString());

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(
                        `YouTube API error: ${response.status} ${response.statusText} - ${errorText}`
                    );
                }

                const data = await response.json();

                const videos: YouTubeVideo[] = [];
                if (data.items) {
                    for (const item of data.items) {
                        if (item.id?.videoId) {
                            videos.push({
                                id: item.id.videoId,
                                title: item.snippet?.title || "Unknown Title",
                                channel:
                                    item.snippet?.channelTitle ||
                                    "Unknown Channel",
                                description: item.snippet?.description || "",
                            });
                        }
                    }
                }

                allResults.push({
                    query,
                    results: videos,
                });
            } catch (error) {
                console.error(
                    `Failed to search YouTube for query "${query}":`,
                    error
                );
                allResults.push({ query, error: (error as Error).message });
            }
        }

        return allResults;
    }

    async generatePlaylist(
        subject: Character | Location | Organization
    ): Promise<Playlist> {
        const client = await this.getGeminiClient();
        const description = await this.buildSubjectDescription(subject);

        const searchTool: Tool = {
            functionDeclarations: [
                {
                    name: "search_youtube",
                    description:
                        "Search YouTube for videos based on a list of queries.",
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            queries: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description:
                                    "List of search queries to find music/ambience.",
                            },
                        },
                        required: ["queries"],
                    },
                },
                {
                    name: "finalize_playlist",
                    description:
                        "Finalize the playlist with the selected tracks.",
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            tracks: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        title: { type: Type.STRING },
                                        artist: { type: Type.STRING },
                                        reason: {
                                            type: Type.STRING,
                                            description:
                                                "Why this track fits the subject",
                                        },
                                    },
                                    required: ["id", "title", "artist"],
                                },
                            },
                        },
                        required: ["tracks"],
                    },
                },
            ],
        };

        const chat = client.chats.create({
            model: "gemini-2.5-flash",
            config: {
                tools: [searchTool],
            },
            history: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `
You are an expert musical curator and DJ. Your task is to create a perfect playlist for a character, location, or organization in a story.

Subject:
${description}

Process:
1. Analyze the subject and determine the mood, genre, and style of music that fits.
2. Generate 3-5 specific search queries for YouTube to find this music. Think about "OST", "Ambience", "Theme", "Mix", "Playlist" keywords.
3. Call 'search_youtube' with these queries.
4. Review the results. Filter out reviews, reactions, or irrelevant videos. Select the best 10-15 tracks that create a cohesive listening experience.
5. Call 'finalize_playlist' with the selected tracks.
`,
                        },
                    ],
                },
            ],
        });

        let result = await chat.sendMessage({
            message: "Start the curation process.",
        });

        // Handle function calling loop
        for (let i = 0; i < 5; i++) {
            const calls = result.functionCalls;

            if (calls && calls.length > 0) {
                const parts: Part[] = [];
                let finalizedTracks: FinalizedTrack[] | null = null;

                for (const call of calls) {
                    if (call.name === "search_youtube") {
                        const args = call.args as { queries: string[] };
                        console.log(
                            `[PlaylistGenerationService] Searching YouTube for: ${args.queries}`
                        );
                        const searchResults = await this.searchYoutube(
                            args.queries
                        );
                        parts.push({
                            functionResponse: {
                                name: "search_youtube",
                                response: { results: searchResults },
                            },
                        });
                    } else if (call.name === "finalize_playlist") {
                        const args = call.args as { tracks: FinalizedTrack[] };
                        finalizedTracks = args.tracks;
                    }
                }

                if (finalizedTracks) {
                    const videoIds = finalizedTracks.map((t) => t.id);
                    const playlistUrl = `https://www.youtube.com/watch_videos?video_ids=${videoIds.join(",")}`;

                    return new Playlist(
                        generateId(),
                        `Playlist for ${subject.name}`,
                        `AI Generated playlist for ${subject.name}`,
                        finalizedTracks.map((t) => ({
                            id: t.id,
                            title: t.title,
                            artist: t.artist,
                            url: `https://www.youtube.com/watch?v=${t.id}`,
                            durationSeconds: 0,
                        })),
                        playlistUrl,
                        "",
                        new Date(),
                        new Date()
                    );
                }

                if (parts.length > 0) {
                    result = await chat.sendMessage({ message: parts });
                } else {
                    break;
                }
            } else {
                if (result.text) {
                    result = await chat.sendMessage({
                        message:
                            "Please finalize the playlist by calling 'finalize_playlist'.",
                    });
                } else {
                    break;
                }
            }
        }

        throw new Error(
            "Failed to generate playlist: Max turns reached or no playlist finalized."
        );
    }
}
