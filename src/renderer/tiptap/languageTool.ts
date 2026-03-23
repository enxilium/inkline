/**
 * Taken from 
 * https://github.com/sereneinserenade/tiptap-languagetool/blob/main/src/components/extensions/languagetool.ts
 * 
 * MIT License

 * Copyright (c) 2022 Jeet Mandaliya

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 * Modified to support per-editor instance state for multiple editor support.
 */

import { Extension, Editor } from "@tiptap/core";
import { Dexie } from "dexie";
import { debounce } from "lodash";
import { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

// *************** TYPES *****************
export interface Software {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    premium: boolean;
    premiumHint: string;
    status: string;
}

export interface Warnings {
    incompleteResults: boolean;
}

export interface DetectedLanguage {
    name: string;
    code: string;
    confidence: number;
}

export interface Language {
    name: string;
    code: string;
    detectedLanguage: DetectedLanguage;
}

export interface Replacement {
    value: string;
}

export interface Context {
    text: string;
    offset: number;
    length: number;
}

export interface Type {
    typeName: string;
}

export interface Category {
    id: string;
    name: string;
}

export interface Rule {
    id: string;
    description: string;
    issueType: string;
    category: Category;
}

export interface Match {
    message: string;
    shortMessage: string;
    replacements: Replacement[];
    offset: number;
    length: number;
    context: Context;
    sentence: string;
    type: Type;
    rule: Rule;
    ignoreForIncompleteSentence: boolean;
    contextForSureMatch: number;
}

export interface LanguageToolResponse {
    software: Software;
    warnings: Warnings;
    language: Language;
    matches: Match[];
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        languagetool: {
            proofread: () => ReturnType;
            toggleProofreading: () => ReturnType;
            ignoreLanguageToolSuggestion: () => ReturnType;
            resetLanguageToolMatch: () => ReturnType;
            toggleLanguageTool: () => ReturnType;
            getLanguageToolState: () => ReturnType;
        };
    }
}

interface ProofreadChunk {
    text: string;
    positionMap: number[];
    from: number;
    to: number;
}

interface LanguageToolOptions {
    language: string;
    automaticMode: boolean;
    documentId: string | number | undefined;
}

export interface LanguageToolStorage {
    match?: Match;
    loading: boolean;
    matchRange?: { from: number; to: number };
    currentMatchId?: string;
    active: boolean;
}

// *************** PLUGIN STATE *****************
// Each editor instance gets its own plugin state
interface LanguageToolPluginState {
    decorationSet: DecorationSet;
    match: Match | undefined;
    matchRange: { from: number; to: number } | undefined;
    proofReadInitially: boolean;
    active: boolean;
    loading: boolean;
}

export enum LanguageToolHelpingWords {
    LanguageToolTransactionName = "languageToolTransaction",
    MatchUpdatedTransactionName = "matchUpdated",
    MatchRangeUpdatedTransactionName = "matchRangeUpdated",
    LoadingTransactionName = "languageToolLoading",
}

// Shared database for ignored suggestions
// Schema stores context around the ignored text to detect modifications
interface IgnoredSuggestion {
    id?: number;
    documentId: string;
    ruleId: string;
    content: string; // The actual text that was flagged
    contextBefore: string; // Text before the flagged content (for modification detection)
    contextAfter: string; // Text after the flagged content
}

// Extend Dexie with typed table
class LanguageToolDB extends Dexie {
    ignoredSuggestions!: Dexie.Table<IgnoredSuggestion, number>;

    constructor() {
        super("LanguageToolIgnoredSuggestions");
        this.version(1).stores({
            ignoredWords: `++id, &value, documentId`,
        });
        this.version(2).stores({
            ignoredWords: null, // Remove old table
            ignoredSuggestions: `++id, [documentId+ruleId+content], documentId`,
        });
    }
}

const db = new LanguageToolDB();

// Helper to create a context signature for modification detection
const CONTEXT_LENGTH = 20;
const getContextSignature = (
    text: string,
    offset: number,
    length: number,
): { before: string; after: string } => {
    const beforeStart = Math.max(0, offset - CONTEXT_LENGTH);
    const afterEnd = Math.min(text.length, offset + length + CONTEXT_LENGTH);
    return {
        before: text.substring(beforeStart, offset),
        after: text.substring(offset + length, afterEnd),
    };
};

// Plugin key - each plugin instance is uniquely identified
export const languageToolPluginKey = new PluginKey<LanguageToolPluginState>(
    "languagetoolPlugin",
);

// Helper to get plugin state from editor
export const getLanguageToolState = (
    editor: Editor,
): LanguageToolPluginState | undefined => {
    return languageToolPluginKey.getState(editor.state);
};

// Generate a unique ID for each decoration to track it reliably
let decorationIdCounter = 0;
const generateMatchId = () => `lt-${Date.now()}-${++decorationIdCounter}`;

const gimmeDecoration = (from: number, to: number, match: Match) => {
    const matchId = generateMatchId();
    return Decoration.inline(
        from,
        to,
        {
            class: `lt lt-${match.rule.issueType}`,
            nodeName: "span",
            // Store all data in DOM attribute - survives hot reload
            "data-match": JSON.stringify({ match, matchId }),
        },
        { matchId }, // Store matchId in spec for filtering
    );
};

// Creates a proofreading function bound to a specific editor view
const createProofreader = (
    view: EditorView,
    documentId: string | number | undefined,
    getPluginState: () => LanguageToolPluginState | undefined,
    updateStorage: (
        match?: Match,
        matchRange?: { from: number; to: number },
        matchId?: string,
    ) => void,
) => {
    const MAX_CHUNK_CHAR_LENGTH = 3200;
    const HOVER_UPDATE_EVENT = "inkline:languagetool-hover-update";
    let delegatedListenerAttached = false;

    const handleDelegatedEvent = (e: Event) => {
        const target = e.target as HTMLElement;

        // Find the closest .lt element (decoration)
        const ltElement = target.closest(".lt") as HTMLElement | null;
        if (!ltElement) {
            return;
        }

        const matchString = ltElement.getAttribute("data-match");
        if (!matchString) return;

        try {
            const { match, matchId } = JSON.parse(matchString) as {
                match: Match;
                matchId: string;
            };

            // Get current positions from actual decoration
            const state = getPluginState();
            if (!state) return;

            // Find decoration to get current from/to positions
            const allDecorations = state.decorationSet.find();
            const decoration = allDecorations.find(
                (d) => d.spec?.matchId === matchId,
            );

            // Get positions from decoration if found, otherwise compute from DOM
            let from: number;
            let to: number;

            if (decoration) {
                from = decoration.from;
                to = decoration.to;
            } else {
                // Fallback: compute position from DOM element
                const pos = view.posAtDOM(ltElement, 0);
                if (pos === undefined || pos === null) return;
                from = pos;
                to = pos + (ltElement.textContent?.length ?? 0);
            }

            // Update storage to trigger React re-render
            updateStorage(match, { from, to }, matchId);

            // Notify popup components immediately. Hover updates do not
            // inherently produce editor transactions.
            view.dom.dispatchEvent(
                new CustomEvent(HOVER_UPDATE_EVENT, {
                    bubbles: true,
                }),
            );
        } catch (error) {
            console.error(
                "[LanguageTool] Error handling decoration event:",
                error,
            );
        }
    };

    const buildProofreadChunk = (doc: PMNode, nodePos = 0): ProofreadChunk => {
        const chars: string[] = [];
        const positionMap: number[] = [];
        let lastDocPos = nodePos + 1;

        doc.descendants((node, pos) => {
            const absolutePos = pos + nodePos;
            let text = "";
            let isTextNode = false;

            if (node.isText) {
                text = node.text || "";
                isTextNode = true;
            } else if (node.type.name === "documentReference") {
                const attrs = node.attrs as {
                    label?: unknown;
                    id?: unknown;
                };
                const label =
                    typeof attrs?.label === "string"
                        ? attrs.label
                        : typeof attrs?.id === "string"
                          ? attrs.id
                          : "";
                text = label;
            }

            if (!text) {
                return;
            }

            if (chars.length > 0 && absolutePos > lastDocPos) {
                chars.push(" ");
                positionMap.push(lastDocPos);
            }

            for (let index = 0; index < text.length; index += 1) {
                chars.push(text[index]);
                if (isTextNode) {
                    positionMap.push(absolutePos + index);
                } else {
                    positionMap.push(absolutePos);
                }
            }

            lastDocPos =
                absolutePos +
                (isTextNode ? text.length : Math.max(node.nodeSize - 1, 1));
        });

        const from = positionMap.length > 0 ? positionMap[0] : nodePos + 1;
        const to =
            positionMap.length > 0
                ? positionMap[positionMap.length - 1] + 1
                : nodePos + 1;

        return {
            text: chars.join(""),
            positionMap,
            from,
            to,
        };
    };

    const splitChunk = (chunk: ProofreadChunk): ProofreadChunk[] => {
        const text = chunk.text;
        if (text.length <= MAX_CHUNK_CHAR_LENGTH) {
            return [chunk];
        }

        const chunks: ProofreadChunk[] = [];
        let cursor = 0;

        while (cursor < text.length) {
            let end = Math.min(cursor + MAX_CHUNK_CHAR_LENGTH, text.length);

            if (end < text.length) {
                const breakAt = text.lastIndexOf(" ", end);
                if (breakAt > cursor + 100) {
                    end = breakAt;
                }
            }

            const slicedText = text.slice(cursor, end);
            const slicedMap = chunk.positionMap.slice(cursor, end);
            if (slicedText.trim()) {
                chunks.push({
                    text: slicedText,
                    positionMap: slicedMap,
                    from: slicedMap.length > 0 ? slicedMap[0] : chunk.from,
                    to:
                        slicedMap.length > 0
                            ? slicedMap[slicedMap.length - 1] + 1
                            : chunk.to,
                });
            }

            cursor = end;
            while (cursor < text.length && text[cursor] === " ") {
                cursor += 1;
            }
        }

        return chunks;
    };

    const setupDelegatedListener = () => {
        if (delegatedListenerAttached) return;
        delegatedListenerAttached = true;

        // Use event delegation on the editor DOM
        view.dom.addEventListener("click", handleDelegatedEvent);
        view.dom.addEventListener("mouseover", handleDelegatedEvent);
    };

    const teardownDelegatedListener = () => {
        if (!delegatedListenerAttached) {
            return;
        }

        delegatedListenerAttached = false;
        view.dom.removeEventListener("click", handleDelegatedEvent);
        view.dom.removeEventListener("mouseover", handleDelegatedEvent);
    };

    // No longer needed - we use delegation now
    const addEventListenersToDecorations = () => {
        setupDelegatedListener();
    };

    const getMatchAndSetDecorations = async (
        doc: PMNode,
        text: string,
        originalFrom: number,
        positionMap?: number[],
        rangeTo?: number,
    ) => {
        const state = getPluginState();
        if (!state) return;

        try {
            // Use IPC to call main process - avoids CORS issues
            const ltRes = await window.languageTool.checkGrammar({
                text,
                language: "en-US",
            });

            const decorations: Decoration[] = [];

            for (const ipcMatch of ltRes.matches) {
                // Convert IPC match to full Match type
                const match: Match = {
                    message: ipcMatch.message,
                    shortMessage: ipcMatch.shortMessage || "",
                    replacements: ipcMatch.replacements,
                    offset: ipcMatch.offset,
                    length: ipcMatch.length,
                    context: ipcMatch.context,
                    sentence: "",
                    type: { typeName: ipcMatch.rule.issueType || "unknown" },
                    rule: {
                        id: ipcMatch.rule.id,
                        description: ipcMatch.rule.description,
                        issueType: ipcMatch.rule.issueType || "unknown",
                        category: ipcMatch.rule.category,
                    },
                    ignoreForIncompleteSentence: false,
                    contextForSureMatch: 0,
                };

                let docFrom = match.offset + originalFrom;
                let docTo = docFrom + match.length;

                if (positionMap && positionMap.length > 0) {
                    const startIndex = Math.max(0, match.offset);
                    const endIndex = Math.max(
                        startIndex,
                        match.offset + match.length - 1,
                    );
                    const startPos = positionMap[startIndex];
                    const endPos = positionMap[endIndex];

                    if (typeof startPos === "number") {
                        docFrom = startPos;
                        docTo =
                            typeof endPos === "number"
                                ? Math.max(startPos + 1, endPos + 1)
                                : startPos + 1;
                    }
                }

                if (documentId) {
                    // Check if this suggestion was previously ignored
                    const content = text.substring(
                        match.offset,
                        match.offset + match.length,
                    );
                    const context = getContextSignature(
                        text,
                        match.offset,
                        match.length,
                    );

                    // Look for a matching ignored suggestion
                    const storedIgnores = await db.ignoredSuggestions
                        .where({
                            documentId: `${documentId}`,
                            ruleId: match.rule.id,
                            content,
                        })
                        .toArray();

                    // Check if any stored ignore is still valid (context matches)
                    const isIgnored = storedIgnores.some(
                        (stored) =>
                            stored.contextBefore === context.before &&
                            stored.contextAfter === context.after,
                    );

                    if (!isIgnored) {
                        decorations.push(
                            gimmeDecoration(docFrom, docTo, match),
                        );
                    }
                } else {
                    decorations.push(gimmeDecoration(docFrom, docTo, match));
                }
            }

            const currentState = getPluginState();
            if (!currentState) return;

            const removeFrom = positionMap?.[0] ?? originalFrom;
            const removeTo =
                positionMap && positionMap.length > 0
                    ? positionMap[positionMap.length - 1] + 1
                    : (rangeTo ?? originalFrom + text.length);

            const decorationsToRemove = currentState.decorationSet.find(
                removeFrom,
                removeTo,
            );

            let newDecorationSet =
                currentState.decorationSet.remove(decorationsToRemove);
            newDecorationSet = newDecorationSet.add(doc, decorations);

            // Dispatch transaction to update decorations
            const tr = view.state.tr.setMeta(
                LanguageToolHelpingWords.LanguageToolTransactionName,
                newDecorationSet,
            );
            view.dispatch(tr);

            setTimeout(addEventListenersToDecorations, 100);
        } catch (error) {
            console.error("[LanguageTool] Fetch error:", error);
        }
    };

    const debouncedGetMatchAndSetDecorations = debounce(
        getMatchAndSetDecorations,
        300,
    );

    let lastOriginalFrom = 0;
    const onNodeChanged = (chunk: ProofreadChunk) => {
        if (chunk.from !== lastOriginalFrom)
            getMatchAndSetDecorations(
                view.state.doc,
                chunk.text,
                chunk.from,
                chunk.positionMap,
                chunk.to,
            );
        else
            debouncedGetMatchAndSetDecorations(
                view.state.doc,
                chunk.text,
                chunk.from,
                chunk.positionMap,
                chunk.to,
            );
        lastOriginalFrom = chunk.from;
    };

    const proofreadAndDecorateWholeDoc = async (doc: PMNode, nodePos = 0) => {
        const fullChunk = buildProofreadChunk(doc, nodePos);
        if (!fullChunk.text.trim()) {
            return;
        }

        const chunksOf500Words = splitChunk(fullChunk).filter((chunk) =>
            chunk.text.trim(),
        );
        if (chunksOf500Words.length === 0) {
            return;
        }

        // Set loading state
        const loadingTr = view.state.tr.setMeta(
            LanguageToolHelpingWords.LoadingTransactionName,
            true,
        );
        view.dispatch(loadingTr);

        const requests = chunksOf500Words.map(
            ({ text, from, positionMap, to }) =>
                getMatchAndSetDecorations(doc, text, from, positionMap, to),
        );

        Promise.all(requests).then(() => {
            const doneTr = view.state.tr.setMeta(
                LanguageToolHelpingWords.LoadingTransactionName,
                false,
            );
            view.dispatch(doneTr);

            const state = getPluginState();
            if (state) state.proofReadInitially = true;
        });
    };

    const debouncedProofreadAndDecorate = debounce(
        proofreadAndDecorateWholeDoc,
        500,
    );

    return {
        buildProofreadChunk,
        proofreadAndDecorateWholeDoc,
        debouncedProofreadAndDecorate,
        onNodeChanged,
        addEventListenersToDecorations,
        teardownDelegatedListener,
    };
};

export const LanguageTool = Extension.create<
    LanguageToolOptions,
    LanguageToolStorage
>({
    name: "languagetool",

    addOptions() {
        return {
            language: "auto",
            automaticMode: true,
            documentId: undefined,
        };
    },

    addStorage() {
        return {
            match: undefined,
            loading: false,
            matchRange: undefined,
            active: true,
        };
    },

    addCommands() {
        return {
            proofread:
                () =>
                ({ editor, tr }) => {
                    const pluginState = languageToolPluginKey.getState(
                        editor.state,
                    );
                    if (pluginState && editor.view) {
                        const proofreader = createProofreader(
                            editor.view,
                            this.options.documentId,
                            () => languageToolPluginKey.getState(editor.state),
                            (match, matchRange, matchId) => {
                                this.storage.match = match;
                                this.storage.matchRange = matchRange;
                                this.storage.currentMatchId = matchId;
                            },
                        );
                        proofreader.proofreadAndDecorateWholeDoc(tr.doc);
                    }
                    return true;
                },

            ignoreLanguageToolSuggestion:
                () =>
                ({ editor }) => {
                    if (this.options.documentId === undefined) {
                        console.error(
                            "[LanguageTool] documentId is undefined! Cannot ignore.",
                        );
                        // Don't throw - just return false so it doesn't crash
                        return false;
                    }

                    const { doc } = editor.state;
                    const pluginState = languageToolPluginKey.getState(
                        editor.state,
                    );

                    // Get the match and range from storage
                    const currentMatch = this.storage.match;
                    const currentMatchRange = this.storage.matchRange;
                    const currentMatchId = this.storage.currentMatchId;

                    if (!currentMatch || !currentMatchRange) {
                        console.warn("[LanguageTool] No match found to ignore");
                        return false;
                    }

                    const { from, to } = currentMatchRange;

                    // Remove the decoration for this match
                    if (pluginState) {
                        // Get all decorations and filter out the one we want to ignore
                        const allDecorations = pluginState.decorationSet.find();

                        const filteredDecorations = allDecorations.filter(
                            (decoration) => {
                                // Filter by matchId if available (most reliable)
                                if (
                                    currentMatchId &&
                                    decoration.spec?.matchId
                                ) {
                                    const keep =
                                        decoration.spec.matchId !==
                                        currentMatchId;
                                    return keep;
                                }
                                // Fallback to position matching
                                const keep = !(
                                    decoration.from === from &&
                                    decoration.to === to
                                );
                                return keep;
                            },
                        );

                        // Create a new decoration set without the ignored decoration
                        const newDecorationSet = DecorationSet.create(
                            doc,
                            filteredDecorations,
                        );
                        const tr = editor.state.tr.setMeta(
                            LanguageToolHelpingWords.LanguageToolTransactionName,
                            newDecorationSet,
                        );
                        editor.view.dispatch(tr);
                    } else {
                        console.warn(
                            "[LanguageTool] No plugin state, cannot remove decoration",
                        );
                    }

                    // Get the full document text for context extraction
                    const fullText = doc.textContent;
                    const content = doc.textBetween(from, to);

                    // Calculate offset within full text
                    // 'from' is 1-based position in ProseMirror, textContent is 0-based
                    const textOffset = from - 1;
                    const context = getContextSignature(
                        fullText,
                        textOffset,
                        to - from,
                    );

                    // Store the ignore with context for modification detection
                    db.ignoredSuggestions.add({
                        documentId: `${this.options.documentId}`,
                        ruleId: currentMatch.rule.id,
                        content: content,
                        contextBefore: context.before,
                        contextAfter: context.after,
                    });

                    // Clear the current match from storage immediately
                    this.storage.match = undefined;
                    this.storage.matchRange = undefined;
                    this.storage.currentMatchId = undefined;

                    return true;
                },

            resetLanguageToolMatch:
                () =>
                ({ editor }) => {
                    this.storage.match = undefined;
                    this.storage.matchRange = undefined;
                    this.storage.currentMatchId = undefined;

                    const pluginState = languageToolPluginKey.getState(
                        editor.state,
                    );
                    if (pluginState) {
                        pluginState.match = undefined;
                        pluginState.matchRange = undefined;
                    }

                    const tr = editor.state.tr
                        .setMeta(
                            LanguageToolHelpingWords.MatchRangeUpdatedTransactionName,
                            true,
                        )
                        .setMeta(
                            LanguageToolHelpingWords.MatchUpdatedTransactionName,
                            true,
                        );
                    editor.view.dispatch(tr);

                    return false;
                },

            toggleLanguageTool:
                () =>
                ({ commands, editor }) => {
                    this.storage.active = !this.storage.active;

                    const pluginState = languageToolPluginKey.getState(
                        editor.state,
                    );
                    if (pluginState) {
                        pluginState.active = this.storage.active;
                    }

                    if (this.storage.active) commands.proofread();
                    else commands.resetLanguageToolMatch();

                    return false;
                },

            getLanguageToolState: () => () => this.storage.active,
        };
    },

    addProseMirrorPlugins() {
        // Extract references to extension properties that we need inside the plugin
        // This avoids aliasing 'this' which ESLint disallows
        const extensionStorage = this.storage;
        const { documentId, automaticMode } = this.options;

        return [
            new Plugin<LanguageToolPluginState>({
                key: languageToolPluginKey,

                state: {
                    init: (_, state): LanguageToolPluginState => {
                        return {
                            decorationSet: DecorationSet.create(state.doc, []),
                            match: undefined,
                            matchRange: undefined,
                            proofReadInitially: false,
                            active: true,
                            loading: false,
                        };
                    },

                    apply: (
                        tr,
                        pluginState,
                        oldState,
                        newState,
                    ): LanguageToolPluginState => {
                        // Handle deactivation
                        if (!extensionStorage.active) {
                            return {
                                ...pluginState,
                                decorationSet: DecorationSet.empty,
                                active: false,
                            };
                        }

                        // Handle loading state
                        const loading = tr.getMeta(
                            LanguageToolHelpingWords.LoadingTransactionName,
                        );
                        if (loading !== undefined) {
                            extensionStorage.loading = loading;
                            return { ...pluginState, loading };
                        }

                        // Handle match updates - sync from plugin state to storage
                        const matchUpdated = tr.getMeta(
                            LanguageToolHelpingWords.MatchUpdatedTransactionName,
                        );
                        const matchRangeUpdated = tr.getMeta(
                            LanguageToolHelpingWords.MatchRangeUpdatedTransactionName,
                        );

                        if (matchUpdated) {
                            extensionStorage.match = pluginState.match;
                        }
                        if (matchRangeUpdated) {
                            extensionStorage.matchRange =
                                pluginState.matchRange;
                        }

                        // Handle new decorations from API response
                        const newDecorations = tr.getMeta(
                            LanguageToolHelpingWords.LanguageToolTransactionName,
                        );
                        if (newDecorations instanceof DecorationSet) {
                            return {
                                ...pluginState,
                                decorationSet: newDecorations,
                            };
                        }

                        // Map decorations through document changes
                        if (tr.docChanged) {
                            return {
                                ...pluginState,
                                decorationSet: pluginState.decorationSet.map(
                                    tr.mapping,
                                    newState.doc,
                                ),
                            };
                        }

                        return pluginState;
                    },
                },

                props: {
                    decorations(state) {
                        const pluginState = this.getState(state);
                        return (
                            pluginState?.decorationSet ?? DecorationSet.empty
                        );
                    },
                    attributes: {
                        spellcheck: "false",
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    handlePaste(view, _event, _slice) {
                        // Re-proofread after paste
                        setTimeout(() => {
                            if (!automaticMode) return;
                            const proofreader = createProofreader(
                                view,
                                documentId,
                                () =>
                                    languageToolPluginKey.getState(view.state),
                                (match, matchRange, matchId) => {
                                    extensionStorage.match = match;
                                    extensionStorage.matchRange = matchRange;
                                    extensionStorage.currentMatchId = matchId;
                                },
                            );
                            proofreader.debouncedProofreadAndDecorate(
                                view.state.doc,
                            );
                        }, 100);
                        return false;
                    },
                },

                view: (view) => {
                    // Create proofreader for this view instance
                    const proofreader = createProofreader(
                        view,
                        documentId,
                        () => languageToolPluginKey.getState(view.state),
                        (match, matchRange, matchId) => {
                            // Set storage directly - React polls this
                            extensionStorage.match = match;
                            extensionStorage.matchRange = matchRange;
                            extensionStorage.currentMatchId = matchId;
                            // No need to dispatch transaction - React polls storage
                        },
                    );

                    // Set up event listeners immediately
                    proofreader.addEventListenersToDecorations();

                    // Initial proofreading
                    if (automaticMode) {
                        setTimeout(
                            () =>
                                proofreader.proofreadAndDecorateWholeDoc(
                                    view.state.doc,
                                ),
                            100,
                        );
                    }

                    return {
                        update: (view, prevState) => {
                            // Ensure event listeners are set up
                            proofreader.addEventListenersToDecorations();

                            // Re-proofread on document changes
                            if (
                                automaticMode &&
                                view.state.doc !== prevState.doc
                            ) {
                                const pluginState =
                                    languageToolPluginKey.getState(view.state);

                                if (!pluginState?.proofReadInitially) {
                                    proofreader.debouncedProofreadAndDecorate(
                                        view.state.doc,
                                    );
                                } else {
                                    // Only check changed nodes
                                    const {
                                        selection: { from, to },
                                    } = view.state;

                                    let changedNodeWithPos:
                                        | { node: PMNode; pos: number }
                                        | undefined;

                                    view.state.doc.descendants((node, pos) => {
                                        if (!node.isBlock) return false;
                                        const [nodeFrom, nodeTo] = [
                                            pos,
                                            pos + node.nodeSize,
                                        ];
                                        if (nodeFrom <= from && to <= nodeTo) {
                                            changedNodeWithPos = { node, pos };
                                            return false;
                                        }
                                        return true;
                                    });

                                    if (changedNodeWithPos) {
                                        const chunk =
                                            proofreader.buildProofreadChunk(
                                                changedNodeWithPos.node,
                                                changedNodeWithPos.pos + 1,
                                            );
                                        proofreader.onNodeChanged(chunk);
                                    }
                                }
                            }
                        },
                        destroy: () => {
                            // Cleanup - could cancel pending requests here if needed
                            proofreader.teardownDelegatedListener();
                        },
                    };
                },
            }),
        ];
    },
});
