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

interface TextNodesWithPosition {
    text: string;
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

// Shared database for ignored words
const db = new Dexie("LanguageToolIgnoredSuggestions");
db.version(1).stores({
    ignoredWords: `++id, &value, documentId`,
});

// Plugin key - each plugin instance is uniquely identified
export const languageToolPluginKey = new PluginKey<LanguageToolPluginState>(
    "languagetoolPlugin"
);

// Helper to get plugin state from editor
export const getLanguageToolState = (
    editor: Editor
): LanguageToolPluginState | undefined => {
    return languageToolPluginKey.getState(editor.state);
};

const gimmeDecoration = (from: number, to: number, match: Match) =>
    Decoration.inline(from, to, {
        class: `lt lt-${match.rule.issueType}`,
        nodeName: "span",
        "data-match": JSON.stringify({ match, from, to }),
    });

const moreThan500Words = (s: string) => s.trim().split(/\s+/).length >= 500;

// Creates a proofreading function bound to a specific editor view
const createProofreader = (
    view: EditorView,
    documentId: string | number | undefined,
    getPluginState: () => LanguageToolPluginState | undefined,
    updateStorage: (
        match?: Match,
        matchRange?: { from: number; to: number }
    ) => void
) => {
    let textNodesWithPosition: TextNodesWithPosition[] = [];
    let delegatedListenerAttached = false;

    const setupDelegatedListener = () => {
        if (delegatedListenerAttached) return;
        delegatedListenerAttached = true;

        const handleEvent = (e: Event) => {
            const target = e.target as HTMLElement;

            // Find the closest .lt element (decoration)
            const ltElement = target.closest(".lt") as HTMLElement | null;
            if (!ltElement) return;

            const matchString = (
                ltElement.getAttribute("data-match") ||
                ltElement.getAttribute("match")
            )?.trim();

            if (!matchString) return;

            try {
                const { match, from, to } = JSON.parse(matchString);

                // Update plugin state
                const state = getPluginState();
                if (state) {
                    state.match = match;
                    state.matchRange = { from, to };
                }

                // Update storage to trigger React re-render
                updateStorage(match, { from, to });
            } catch (error) {
                console.error("[LanguageTool] Error parsing match:", error);
            }
        };

        // Use event delegation on the editor DOM
        view.dom.addEventListener("click", handleEvent);
        view.dom.addEventListener("mouseenter", handleEvent, true); // Capture phase for mouseenter
    };

    // No longer needed - we use delegation now
    const addEventListenersToDecorations = () => {
        setupDelegatedListener();
    };

    const getMatchAndSetDecorations = async (
        doc: PMNode,
        text: string,
        originalFrom: number
    ) => {
        const state = getPluginState();
        if (!state) return;

        try {
            // Use IPC to call main process - avoids CORS issues
            const ltRes = await window.languageTool.checkGrammar({
                text,
                language: "auto",
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

                const docFrom = match.offset + originalFrom;
                const docTo = docFrom + match.length;

                if (documentId) {
                    const content = text.substring(
                        match.offset - 1,
                        match.offset + match.length - 1
                    );
                    const result = await (db as any).ignoredWords.get({
                        value: content,
                    });
                    if (!result)
                        decorations.push(
                            gimmeDecoration(docFrom, docTo, match)
                        );
                } else {
                    decorations.push(gimmeDecoration(docFrom, docTo, match));
                }
            }

            const currentState = getPluginState();
            if (!currentState) return;

            const decorationsToRemove = currentState.decorationSet.find(
                originalFrom,
                originalFrom + text.length
            );
            let newDecorationSet =
                currentState.decorationSet.remove(decorationsToRemove);
            newDecorationSet = newDecorationSet.add(doc, decorations);

            // Dispatch transaction to update decorations
            const tr = view.state.tr.setMeta(
                LanguageToolHelpingWords.LanguageToolTransactionName,
                newDecorationSet
            );
            view.dispatch(tr);

            setTimeout(addEventListenersToDecorations, 100);
        } catch (error) {
            console.error("[LanguageTool] Fetch error:", error);
        }
    };

    const debouncedGetMatchAndSetDecorations = debounce(
        getMatchAndSetDecorations,
        300
    );

    let lastOriginalFrom = 0;
    const onNodeChanged = (doc: PMNode, text: string, originalFrom: number) => {
        if (originalFrom !== lastOriginalFrom)
            getMatchAndSetDecorations(doc, text, originalFrom);
        else debouncedGetMatchAndSetDecorations(doc, text, originalFrom);
        lastOriginalFrom = originalFrom;
    };

    const proofreadAndDecorateWholeDoc = async (doc: PMNode, nodePos = 0) => {
        textNodesWithPosition = [];

        let index = 0;
        doc?.descendants((node, pos) => {
            if (!node.isText) {
                index += 1;
                return;
            }

            const intermediateTextNodeWIthPos = {
                text: "",
                from: -1,
                to: -1,
            };

            if (textNodesWithPosition[index]) {
                intermediateTextNodeWIthPos.text =
                    textNodesWithPosition[index].text + node.text;
                intermediateTextNodeWIthPos.from =
                    textNodesWithPosition[index].from + nodePos;
                intermediateTextNodeWIthPos.to =
                    intermediateTextNodeWIthPos.from +
                    intermediateTextNodeWIthPos.text.length +
                    nodePos;
            } else {
                intermediateTextNodeWIthPos.text = node.text;
                intermediateTextNodeWIthPos.from = pos + nodePos;
                intermediateTextNodeWIthPos.to =
                    pos + nodePos + node.text.length;
            }

            textNodesWithPosition[index] = intermediateTextNodeWIthPos;
        });

        textNodesWithPosition = textNodesWithPosition.filter(Boolean);

        let finalText = "";
        const chunksOf500Words: { from: number; text: string }[] = [];
        let upperFrom = 0 + nodePos;
        let newDataSet = true;
        let lastPos = 1 + nodePos;

        for (const { text, from, to } of textNodesWithPosition) {
            if (!newDataSet) {
                upperFrom = from;
                newDataSet = true;
            } else {
                const diff = from - lastPos;
                if (diff > 0) finalText += Array(diff + 1).join(" ");
            }

            lastPos = to;
            finalText += text;

            if (moreThan500Words(finalText)) {
                const updatedFrom = chunksOf500Words.length
                    ? upperFrom
                    : upperFrom + 1;
                chunksOf500Words.push({ from: updatedFrom, text: finalText });
                finalText = "";
                newDataSet = false;
            }
        }

        chunksOf500Words.push({
            from: chunksOf500Words.length ? upperFrom : 1,
            text: finalText,
        });

        if (
            chunksOf500Words.length === 0 ||
            chunksOf500Words.every((c) => !c.text.trim())
        ) {
            return;
        }

        // Set loading state
        const loadingTr = view.state.tr.setMeta(
            LanguageToolHelpingWords.LoadingTransactionName,
            true
        );
        view.dispatch(loadingTr);

        const requests = chunksOf500Words
            .filter((c) => c.text.trim())
            .map(({ text, from }) =>
                getMatchAndSetDecorations(doc, text, from)
            );

        Promise.all(requests).then(() => {
            const doneTr = view.state.tr.setMeta(
                LanguageToolHelpingWords.LoadingTransactionName,
                false
            );
            view.dispatch(doneTr);

            const state = getPluginState();
            if (state) state.proofReadInitially = true;
        });
    };

    const debouncedProofreadAndDecorate = debounce(
        proofreadAndDecorateWholeDoc,
        500
    );

    return {
        proofreadAndDecorateWholeDoc,
        debouncedProofreadAndDecorate,
        onNodeChanged,
        addEventListenersToDecorations,
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
                        editor.state
                    );
                    if (pluginState && editor.view) {
                        const proofreader = createProofreader(
                            editor.view,
                            this.options.documentId,
                            () => languageToolPluginKey.getState(editor.state),
                            (match, matchRange) => {
                                this.storage.match = match;
                                this.storage.matchRange = matchRange;
                            }
                        );
                        proofreader.proofreadAndDecorateWholeDoc(tr.doc);
                    }
                    return true;
                },

            ignoreLanguageToolSuggestion:
                () =>
                ({ editor }) => {
                    if (this.options.documentId === undefined) {
                        throw new Error(
                            "Please provide a unique Document ID(number|string)"
                        );
                    }

                    const { selection, doc } = editor.state;
                    const { from, to } = selection;
                    const pluginState = languageToolPluginKey.getState(
                        editor.state
                    );

                    if (pluginState) {
                        const newDecorationSet =
                            pluginState.decorationSet.remove(
                                pluginState.decorationSet.find(from, to)
                            );
                        const tr = editor.state.tr.setMeta(
                            LanguageToolHelpingWords.LanguageToolTransactionName,
                            newDecorationSet
                        );
                        editor.view.dispatch(tr);
                    }

                    const content = doc.textBetween(from, to);
                    (db as any).ignoredWords.add({
                        value: content,
                        documentId: `${this.options.documentId}`,
                    });

                    return false;
                },

            resetLanguageToolMatch:
                () =>
                ({ editor }) => {
                    this.storage.match = undefined;
                    this.storage.matchRange = undefined;

                    const pluginState = languageToolPluginKey.getState(
                        editor.state
                    );
                    if (pluginState) {
                        pluginState.match = undefined;
                        pluginState.matchRange = undefined;
                    }

                    const tr = editor.state.tr
                        .setMeta(
                            LanguageToolHelpingWords.MatchRangeUpdatedTransactionName,
                            true
                        )
                        .setMeta(
                            LanguageToolHelpingWords.MatchUpdatedTransactionName,
                            true
                        );
                    editor.view.dispatch(tr);

                    return false;
                },

            toggleLanguageTool:
                () =>
                ({ commands, editor }) => {
                    this.storage.active = !this.storage.active;

                    const pluginState = languageToolPluginKey.getState(
                        editor.state
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
        const extensionThis = this;
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
                        newState
                    ): LanguageToolPluginState => {
                        // Handle deactivation
                        if (!extensionThis.storage.active) {
                            return {
                                ...pluginState,
                                decorationSet: DecorationSet.empty,
                                active: false,
                            };
                        }

                        // Handle loading state
                        const loading = tr.getMeta(
                            LanguageToolHelpingWords.LoadingTransactionName
                        );
                        if (loading !== undefined) {
                            extensionThis.storage.loading = loading;
                            return { ...pluginState, loading };
                        }

                        // Handle match updates - sync from plugin state to storage
                        const matchUpdated = tr.getMeta(
                            LanguageToolHelpingWords.MatchUpdatedTransactionName
                        );
                        const matchRangeUpdated = tr.getMeta(
                            LanguageToolHelpingWords.MatchRangeUpdatedTransactionName
                        );

                        if (matchUpdated) {
                            extensionThis.storage.match = pluginState.match;
                        }
                        if (matchRangeUpdated) {
                            extensionThis.storage.matchRange =
                                pluginState.matchRange;
                        }

                        // Handle new decorations from API response
                        const newDecorations = tr.getMeta(
                            LanguageToolHelpingWords.LanguageToolTransactionName
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
                                    newState.doc
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
                    handlePaste(view, event, slice) {
                        // Re-proofread after paste
                        setTimeout(() => {
                            if (!automaticMode) return;
                            const proofreader = createProofreader(
                                view,
                                documentId,
                                () =>
                                    languageToolPluginKey.getState(view.state),
                                (match, matchRange) => {
                                    extensionThis.storage.match = match;
                                    extensionThis.storage.matchRange =
                                        matchRange;
                                }
                            );
                            proofreader.debouncedProofreadAndDecorate(
                                view.state.doc
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
                        (match, matchRange) => {
                            extensionThis.storage.match = match;
                            extensionThis.storage.matchRange = matchRange;

                            // Dispatch update to trigger any listeners
                            const tr = view.state.tr
                                .setMeta(
                                    LanguageToolHelpingWords.MatchUpdatedTransactionName,
                                    true
                                )
                                .setMeta(
                                    LanguageToolHelpingWords.MatchRangeUpdatedTransactionName,
                                    true
                                );
                            view.dispatch(tr);
                        }
                    );

                    // Initial proofreading
                    if (automaticMode) {
                        setTimeout(
                            () =>
                                proofreader.proofreadAndDecorateWholeDoc(
                                    view.state.doc
                                ),
                            100
                        );
                    }

                    return {
                        update: (view, prevState) => {
                            // Add event listeners after each update
                            setTimeout(
                                () =>
                                    proofreader.addEventListenersToDecorations(),
                                100
                            );

                            // Re-proofread on document changes
                            if (
                                automaticMode &&
                                view.state.doc !== prevState.doc
                            ) {
                                const pluginState =
                                    languageToolPluginKey.getState(view.state);

                                if (!pluginState?.proofReadInitially) {
                                    proofreader.debouncedProofreadAndDecorate(
                                        view.state.doc
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
                                        proofreader.onNodeChanged(
                                            changedNodeWithPos.node,
                                            changedNodeWithPos.node.textContent,
                                            changedNodeWithPos.pos + 1
                                        );
                                    }
                                }
                            }
                        },
                        destroy: () => {
                            // Cleanup - could cancel pending requests here if needed
                        },
                    };
                },
            }),
        ];
    },
});
