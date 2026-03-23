const MAX_CACHE_ENTRIES = 2000;
const ENABLE_NIGHT_DISPLAY_COLOR_SHIFT = true;
const DARK_COLOR_LUMINANCE_THRESHOLD = 0.2;

type RgbaColor = {
    r: number;
    g: number;
    b: number;
    a: number;
};

const colorShiftCache = new Map<string, string>();
const htmlShiftCache = new Map<string, string>();
let browserColorParserElement: HTMLSpanElement | null = null;

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function trimCache<K, V>(cache: Map<K, V>): void {
    while (cache.size > MAX_CACHE_ENTRIES) {
        const first = cache.keys().next().value as K | undefined;
        if (first === undefined) {
            break;
        }
        cache.delete(first);
    }
}

function hasInlineColorDeclaration(styleValue: string): boolean {
    return /(?:^|;)\s*color\s*:/i.test(styleValue);
}

function parseHexColor(raw: string): RgbaColor | null {
    const input = raw.trim();
    if (!input.startsWith("#")) {
        return null;
    }

    const hex = input.slice(1);

    if (hex.length === 3 || hex.length === 4) {
        const [r, g, b, a = "f"] = hex.split("");
        const rr = parseInt(r + r, 16);
        const gg = parseInt(g + g, 16);
        const bb = parseInt(b + b, 16);
        const aa = parseInt(a + a, 16) / 255;
        if ([rr, gg, bb, aa].some((v) => Number.isNaN(v))) {
            return null;
        }
        return { r: rr, g: gg, b: bb, a: aa };
    }

    if (hex.length === 6 || hex.length === 8) {
        const rr = parseInt(hex.slice(0, 2), 16);
        const gg = parseInt(hex.slice(2, 4), 16);
        const bb = parseInt(hex.slice(4, 6), 16);
        const aa = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;

        if ([rr, gg, bb, aa].some((v) => Number.isNaN(v))) {
            return null;
        }
        return { r: rr, g: gg, b: bb, a: aa };
    }

    return null;
}

function parseRgbColor(raw: string): RgbaColor | null {
    const match = raw.trim().match(/^rgba?\(([^)]+)\)$/i);
    if (!match) {
        return null;
    }

    const parts = match[1].split(",").map((part) => part.trim());
    if (parts.length < 3 || parts.length > 4) {
        return null;
    }

    const parseChannel = (value: string): number | null => {
        if (value.endsWith("%")) {
            const pct = Number.parseFloat(value.slice(0, -1));
            if (!Number.isFinite(pct)) {
                return null;
            }
            return Math.round(clamp01(pct / 100) * 255);
        }

        const channel = Number.parseFloat(value);
        if (!Number.isFinite(channel)) {
            return null;
        }

        return Math.max(0, Math.min(255, Math.round(channel)));
    };

    const r = parseChannel(parts[0]);
    const g = parseChannel(parts[1]);
    const b = parseChannel(parts[2]);
    if (r === null || g === null || b === null) {
        return null;
    }

    let a = 1;
    if (parts.length === 4) {
        const alphaRaw = parts[3];
        if (alphaRaw.endsWith("%")) {
            const pct = Number.parseFloat(alphaRaw.slice(0, -1));
            if (!Number.isFinite(pct)) {
                return null;
            }
            a = clamp01(pct / 100);
        } else {
            const alpha = Number.parseFloat(alphaRaw);
            if (!Number.isFinite(alpha)) {
                return null;
            }
            a = clamp01(alpha);
        }
    }

    return { r, g, b, a };
}

function parseCssColor(raw: string): RgbaColor | null {
    return (
        parseHexColor(raw) ?? parseRgbColor(raw) ?? parseBrowserCssColor(raw)
    );
}

function parseBrowserCssColor(raw: string): RgbaColor | null {
    if (typeof document === "undefined" || typeof window === "undefined") {
        return null;
    }

    const value = raw.trim();
    if (!value) {
        return null;
    }

    if (!browserColorParserElement) {
        browserColorParserElement = document.createElement("span");
        browserColorParserElement.style.position = "absolute";
        browserColorParserElement.style.opacity = "0";
        browserColorParserElement.style.pointerEvents = "none";
        browserColorParserElement.style.width = "0";
        browserColorParserElement.style.height = "0";
        browserColorParserElement.style.visibility = "hidden";
    }

    const host = document.body ?? document.documentElement;
    if (!browserColorParserElement.isConnected) {
        host.appendChild(browserColorParserElement);
    }

    browserColorParserElement.style.color = "";
    browserColorParserElement.style.color = value;
    if (!browserColorParserElement.style.color) {
        return null;
    }

    const resolved = window.getComputedStyle(browserColorParserElement).color;
    return parseRgbColor(resolved);
}

function toLinearSrgb(channel: number): number {
    const normalized = channel / 255;
    if (normalized <= 0.04045) {
        return normalized / 12.92;
    }
    return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: RgbaColor): number {
    const r = toLinearSrgb(color.r);
    const g = toLinearSrgb(color.g);
    const b = toLinearSrgb(color.b);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;

    if (max === min) {
        return [0, 0, l];
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h = 0;
    if (max === rn) {
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
    } else if (max === gn) {
        h = (bn - rn) / d + 2;
    } else {
        h = (rn - gn) / d + 4;
    }

    h /= 6;
    return [h, s, l];
}

function hueToRgb(p: number, q: number, t: number): number {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    if (s === 0) {
        const gray = Math.round(l * 255);
        return [gray, gray, gray];
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    const r = hueToRgb(p, q, h + 1 / 3);
    const g = hueToRgb(p, q, h);
    const b = hueToRgb(p, q, h - 1 / 3);

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function shiftRgbForNightDisplay(input: RgbaColor): RgbaColor {
    if (input.a <= 0) {
        return input;
    }

    const luminance = relativeLuminance(input);
    if (luminance >= DARK_COLOR_LUMINANCE_THRESHOLD) {
        return input;
    }

    const [h, s, l] = rgbToHsl(input.r, input.g, input.b);
    const darkness = clamp01(
        (DARK_COLOR_LUMINANCE_THRESHOLD - luminance) /
            DARK_COLOR_LUMINANCE_THRESHOLD,
    );

    // Neutral dark tones (including black) should become light neutrals.
    if (s <= 0.12) {
        const gray = Math.round(210 + 45 * darkness);
        return { r: gray, g: gray, b: gray, a: input.a };
    }

    // Preserve hue and only lift dark colors enough for dark-surface readability.
    const shiftedLightness = Math.max(l, 0.62 + 0.28 * darkness);
    const shiftedSaturation = clamp01(s * (0.92 + 0.08 * darkness));

    const [r, g, b] = hslToRgb(h, shiftedSaturation, clamp01(shiftedLightness));

    return {
        r,
        g,
        b,
        a: input.a,
    };
}

function rgbaToCss(color: RgbaColor): string {
    const a = Math.round(color.a * 1000) / 1000;
    if (a >= 1) {
        return `rgb(${color.r}, ${color.g}, ${color.b})`;
    }
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${a})`;
}

export function shouldShiftDisplayColorsForCurrentTheme(): boolean {
    if (typeof document === "undefined") {
        return false;
    }

    if (!ENABLE_NIGHT_DISPLAY_COLOR_SHIFT) {
        return false;
    }

    const theme = document.documentElement.dataset.theme;
    return theme !== "light";
}

export function shiftCssColorForNightDisplay(color: string): string {
    const cacheKey = color.trim();
    const cached = colorShiftCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const parsed = parseCssColor(cacheKey);
    if (!parsed) {
        colorShiftCache.set(cacheKey, color);
        trimCache(colorShiftCache);
        return color;
    }

    const shifted = rgbaToCss(shiftRgbForNightDisplay(parsed));
    colorShiftCache.set(cacheKey, shifted);
    trimCache(colorShiftCache);
    return shifted;
}

export function applyNightDisplayColorShiftToDom(
    root: HTMLElement,
    enabled: boolean,
): void {
    const elements = root.querySelectorAll<HTMLElement>(
        "[style*='color'], [data-inkline-original-color]",
    );

    for (const element of Array.from(elements)) {
        const styleAttr = element.getAttribute("style") || "";
        if (!hasInlineColorDeclaration(styleAttr)) {
            continue;
        }

        const existingOriginal = element.dataset.inklineOriginalColor;
        const originalColor =
            existingOriginal || element.style.getPropertyValue("color").trim();

        if (!originalColor) {
            continue;
        }

        if (enabled) {
            if (!existingOriginal) {
                element.dataset.inklineOriginalColor = originalColor;
            }
            const shifted = shiftCssColorForNightDisplay(originalColor);
            const currentColor = element.style.getPropertyValue("color").trim();
            if (currentColor !== shifted) {
                element.style.setProperty("color", shifted, "important");
            }
            continue;
        }

        if (existingOriginal) {
            element.style.removeProperty("color");
            element.style.setProperty("color", existingOriginal);
            delete element.dataset.inklineOriginalColor;
        }
    }
}

function transformStyleAttrForNightDisplay(styleAttr: string): string {
    const declarations = styleAttr
        .split(";")
        .map((entry) => entry.trim())
        .filter(Boolean);

    if (declarations.length === 0) {
        return styleAttr;
    }

    const transformed = declarations.map((entry) => {
        const separator = entry.indexOf(":");
        if (separator < 0) {
            return entry;
        }

        const prop = entry.slice(0, separator).trim();
        const value = entry.slice(separator + 1).trim();

        if (prop.toLowerCase() !== "color") {
            return `${prop}: ${value}`;
        }

        const important = /\s*!important\s*$/i.test(value);
        const normalizedValue = important
            ? value.replace(/\s*!important\s*$/i, "").trim()
            : value;
        const shifted = shiftCssColorForNightDisplay(normalizedValue);
        return `${prop}: ${shifted}${important ? " !important" : ""}`;
    });

    return transformed.join("; ");
}

export function transformHtmlForNightDisplay(
    html: string,
    enabled: boolean,
): string {
    if (!enabled || !html.trim() || typeof DOMParser === "undefined") {
        return html;
    }

    const cacheKey = `${enabled ? "1" : "0"}:${html}`;
    const cached = htmlShiftCache.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const doc = new DOMParser().parseFromString(html, "text/html");
    const elements = doc.body.querySelectorAll<HTMLElement>("[style]");

    for (const element of Array.from(elements)) {
        const styleAttr = element.getAttribute("style") || "";
        if (!hasInlineColorDeclaration(styleAttr)) {
            continue;
        }

        const transformedStyle = transformStyleAttrForNightDisplay(styleAttr);
        element.setAttribute("style", transformedStyle);
    }

    const transformed = doc.body.innerHTML;
    htmlShiftCache.set(cacheKey, transformed);
    trimCache(htmlShiftCache);
    return transformed;
}
