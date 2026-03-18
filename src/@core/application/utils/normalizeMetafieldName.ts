export const normalizeMetafieldName = (name: string): string =>
    name.trim().replace(/\s+/g, " ").toLowerCase();
