import type { Json } from "./database.types";

export const asStringArray = (value: Json | null | undefined): string[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((entry) => (typeof entry === "string" ? entry : ""))
        .filter(Boolean);
};

export const asPowersArray = (
    value: Json | null | undefined,
): { title: string; description: string }[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return { title: "", description: "" };
        }

        const title = typeof entry.title === "string" ? entry.title : "";
        const description =
            typeof entry.description === "string" ? entry.description : "";

        return { title, description };
    });
};
