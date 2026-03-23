import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import {
    shiftCssColorForNightDisplay,
    shouldShiftDisplayColorsForCurrentTheme,
} from "../utils/displayColorShift";

const nightModeDisplayColorShiftKey = new PluginKey(
    "nightModeDisplayColorShift",
);

type NightModeShiftState = {
    enabled: boolean;
    decorations: DecorationSet;
};

type NightModeDisplayColorShiftOptions = {
    isEnabled: () => boolean;
};

const DEFAULT_UNMARKED_TEXT_COLOR = "#000000";

function getDefaultDisplayTextColor(enabled: boolean): string {
    return enabled
        ? shiftCssColorForNightDisplay(DEFAULT_UNMARKED_TEXT_COLOR)
        : DEFAULT_UNMARKED_TEXT_COLOR;
}

function buildNightModeDecorations(
    doc: Parameters<typeof DecorationSet.create>[0],
    enabled: boolean,
): DecorationSet {
    if (!enabled) {
        return DecorationSet.empty;
    }

    const decorations: Decoration[] = [];

    doc.descendants((node, pos) => {
        if (!node.isText || !node.text || node.nodeSize <= 1) {
            return;
        }

        const textStyleMark = node.marks.find(
            (mark) => mark.type.name === "textStyle",
        );
        const rawColor = textStyleMark?.attrs?.color;
        if (typeof rawColor !== "string" || !rawColor.trim()) {
            return;
        }

        const shifted = shiftCssColorForNightDisplay(rawColor);
        if (shifted === rawColor) {
            return;
        }

        decorations.push(
            Decoration.inline(pos, pos + node.nodeSize, {
                style: `color: ${shifted} !important;`,
            }),
        );
    });

    return DecorationSet.create(doc, decorations);
}

export const NightModeDisplayColorShift =
    Extension.create<NightModeDisplayColorShiftOptions>({
        name: "nightModeDisplayColorShift",

        addOptions() {
            return {
                isEnabled: shouldShiftDisplayColorsForCurrentTheme,
            };
        },

        addProseMirrorPlugins() {
            const getEnabled = this.options.isEnabled;

            return [
                new Plugin({
                    key: nightModeDisplayColorShiftKey,
                    state: {
                        init: (_, state): NightModeShiftState => {
                            const enabled = getEnabled();
                            return {
                                enabled,
                                decorations: buildNightModeDecorations(
                                    state.doc,
                                    enabled,
                                ),
                            };
                        },
                        apply: (
                            tr,
                            pluginState: NightModeShiftState,
                            _oldState,
                            newState,
                        ): NightModeShiftState => {
                            const meta = tr.getMeta(
                                nightModeDisplayColorShiftKey,
                            ) as { themeChanged?: boolean } | undefined;

                            const enabled = getEnabled();
                            const shouldRebuild =
                                tr.docChanged ||
                                Boolean(meta?.themeChanged) ||
                                enabled !== pluginState.enabled;

                            if (!shouldRebuild) {
                                return pluginState;
                            }

                            return {
                                enabled,
                                decorations: buildNightModeDecorations(
                                    newState.doc,
                                    enabled,
                                ),
                            };
                        },
                    },
                    props: {
                        attributes(state) {
                            const current = this.getState(
                                state,
                            ) as NightModeShiftState;

                            return {
                                style: `color: ${getDefaultDisplayTextColor(current.enabled)};`,
                            };
                        },
                        decorations(state) {
                            const current = this.getState(
                                state,
                            ) as NightModeShiftState;
                            return current.decorations;
                        },
                    },
                    view: (view) => {
                        const observer = new MutationObserver((mutations) => {
                            const hasThemeMutation = mutations.some(
                                (mutation) =>
                                    mutation.type === "attributes" &&
                                    mutation.attributeName === "data-theme",
                            );
                            if (hasThemeMutation) {
                                const tr = view.state.tr.setMeta(
                                    nightModeDisplayColorShiftKey,
                                    { themeChanged: true },
                                );
                                view.dispatch(tr);
                            }
                        });

                        observer.observe(document.documentElement, {
                            attributes: true,
                            attributeFilter: ["data-theme"],
                        });

                        return {
                            update: () => {
                                // Decoration state handles updates via plugin apply.
                            },
                            destroy: () => {
                                observer.disconnect();
                            },
                        };
                    },
                }),
            ];
        },
    });
