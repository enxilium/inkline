import { Extension, type Range } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        searchAndReplace: {
            setSearchTerm: (searchTerm: string) => ReturnType;
            setReplaceTerm: (replaceTerm: string) => ReturnType;
            replace: () => ReturnType;
            replaceAll: () => ReturnType;
            selectNextResult: () => ReturnType;
            selectPreviousResult: () => ReturnType;
            setCaseSensitive: (caseSensitive: boolean) => ReturnType;
        };
    }
}

type TextNodeWithPosition = {
    text: string;
    pos: number;
};

const escapeRegExp = (value: string): string => {
    return value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
};

const getRegex = (params: {
    searchString: string;
    disableRegex: boolean;
    caseSensitive: boolean;
}): RegExp => {
    const source = params.disableRegex
        ? escapeRegExp(params.searchString)
        : params.searchString;

    // Use unicode flag for correct ranges. Global for matchAll.
    const flags = params.caseSensitive ? "gu" : "giu";
    return new RegExp(source, flags);
};

type ProcessedSearches = {
    decorationsToReturn: DecorationSet;
    results: Range[];
};

const processSearches = (params: {
    doc: PMNode;
    searchTerm: RegExp;
    selectedResultIndex: number;
    searchResultClass: string;
    selectedResultClass: string;
}): ProcessedSearches => {
    const decorations: Decoration[] = [];
    const results: Range[] = [];
    const textNodesWithPosition: TextNodeWithPosition[] = [];

    params.doc.descendants((node, pos) => {
        if (node.isText) {
            textNodesWithPosition.push({ text: node.text || "", pos });
        }
    });

    for (const { text, pos } of textNodesWithPosition) {
        const matches = Array.from(text.matchAll(params.searchTerm)).filter(
            ([matchText]) => matchText.trim()
        );

        for (const match of matches) {
            if (match.index === undefined) {
                continue;
            }
            results.push({
                from: pos + match.index,
                to: pos + match.index + match[0].length,
            });
        }
    }

    for (let i = 0; i < results.length; i++) {
        const { from, to } = results[i];
        decorations.push(
            Decoration.inline(from, to, {
                class:
                    params.selectedResultIndex === i
                        ? params.selectedResultClass
                        : params.searchResultClass,
            })
        );
    }

    return {
        decorationsToReturn: DecorationSet.create(params.doc, decorations),
        results,
    };
};

const scrollToResult = (editorView: EditorView | undefined, from: number) => {
    if (!editorView) {
        return;
    }

    try {
        // domAtPos returns a DOM node; scroll into view for convenience.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        editorView.domAtPos(from).node.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
    } catch {
        // Ignore scroll failures.
    }
};

export const searchAndReplacePluginKey = new PluginKey(
    "inklineSearchAndReplacePlugin"
);

export type SearchAndReplaceOptions = {
    searchResultClass: string;
    selectedResultClass: string;
    disableRegex: boolean;
};

export type SearchAndReplaceStorage = {
    searchTerm: string;
    replaceTerm: string;
    results: Range[];
    lastSearchTerm: string;
    selectedResult: number;
    lastSelectedResult: number;
    caseSensitive: boolean;
    lastCaseSensitiveState: boolean;
};

declare module "@tiptap/core" {
    interface Storage {
        searchAndReplace: SearchAndReplaceStorage;
    }
}

type RefreshMeta = { type: "refresh" };

export const SearchAndReplace = Extension.create<
    SearchAndReplaceOptions,
    SearchAndReplaceStorage
>({
    name: "searchAndReplace",

    addOptions() {
        return {
            searchResultClass: "inkline-editor-search-result",
            selectedResultClass: "inkline-editor-search-result-selected",
            disableRegex: true,
        };
    },

    addStorage() {
        return {
            searchTerm: "",
            replaceTerm: "",
            results: [],
            lastSearchTerm: "",
            selectedResult: 0,
            lastSelectedResult: 0,
            caseSensitive: false,
            lastCaseSensitiveState: false,
        };
    },

    addCommands() {
        return {
            setSearchTerm:
                (searchTerm: string) =>
                ({ editor, tr, dispatch }) => {
                    editor.storage.searchAndReplace.searchTerm = searchTerm;
                    if (dispatch) {
                        dispatch(
                            tr.setMeta(searchAndReplacePluginKey, {
                                type: "refresh",
                            } as RefreshMeta)
                        );
                    }
                    return true;
                },
            setReplaceTerm:
                (replaceTerm: string) =>
                ({ editor, tr, dispatch }) => {
                    editor.storage.searchAndReplace.replaceTerm = replaceTerm;
                    if (dispatch) {
                        dispatch(
                            tr.setMeta(searchAndReplacePluginKey, {
                                type: "refresh",
                            } as RefreshMeta)
                        );
                    }
                    return true;
                },
            setCaseSensitive:
                (caseSensitive: boolean) =>
                ({ editor, tr, dispatch }) => {
                    editor.storage.searchAndReplace.caseSensitive =
                        caseSensitive;
                    if (dispatch) {
                        dispatch(
                            tr.setMeta(searchAndReplacePluginKey, {
                                type: "refresh",
                            } as RefreshMeta)
                        );
                    }
                    return true;
                },
            selectNextResult:
                () =>
                ({ editor, tr, dispatch }) => {
                    const storage = editor.storage
                        .searchAndReplace as SearchAndReplaceStorage;
                    if (!storage.results.length) {
                        return true;
                    }

                    storage.selectedResult =
                        storage.selectedResult >= storage.results.length - 1
                            ? 0
                            : storage.selectedResult + 1;

                    const range = storage.results[storage.selectedResult];
                    if (range) {
                        tr.setSelection(
                            TextSelection.create(tr.doc, range.from, range.to)
                        );
                        tr.scrollIntoView();
                        scrollToResult(editor.view, range.from);
                    }

                    if (dispatch) {
                        dispatch(
                            tr.setMeta(searchAndReplacePluginKey, {
                                type: "refresh",
                            } as RefreshMeta)
                        );
                    }
                    return true;
                },
            selectPreviousResult:
                () =>
                ({ editor, tr, dispatch }) => {
                    const storage = editor.storage
                        .searchAndReplace as SearchAndReplaceStorage;
                    if (!storage.results.length) {
                        return true;
                    }

                    storage.selectedResult =
                        storage.selectedResult <= 0
                            ? storage.results.length - 1
                            : storage.selectedResult - 1;

                    const range = storage.results[storage.selectedResult];
                    if (range) {
                        tr.setSelection(
                            TextSelection.create(tr.doc, range.from, range.to)
                        );
                        tr.scrollIntoView();
                        scrollToResult(editor.view, range.from);
                    }

                    if (dispatch) {
                        dispatch(
                            tr.setMeta(searchAndReplacePluginKey, {
                                type: "refresh",
                            } as RefreshMeta)
                        );
                    }
                    return true;
                },
            replace:
                () =>
                ({ editor, tr, dispatch }) => {
                    const storage = editor.storage
                        .searchAndReplace as SearchAndReplaceStorage;
                    const range = storage.results[storage.selectedResult];
                    if (!range) {
                        return true;
                    }

                    tr.insertText(storage.replaceTerm, range.from, range.to);
                    tr.setMeta(searchAndReplacePluginKey, {
                        type: "refresh",
                    } as RefreshMeta);

                    if (dispatch) {
                        dispatch(tr);
                    }
                    return true;
                },
            replaceAll:
                () =>
                ({ editor, tr, dispatch }) => {
                    const storage = editor.storage
                        .searchAndReplace as SearchAndReplaceStorage;
                    if (!storage.results.length) {
                        return true;
                    }

                    // Replace from the end to avoid rebasing offsets.
                    for (let i = storage.results.length - 1; i >= 0; i--) {
                        const { from, to } = storage.results[i];
                        tr.insertText(storage.replaceTerm, from, to);
                    }

                    tr.setMeta(searchAndReplacePluginKey, {
                        type: "refresh",
                    } as RefreshMeta);

                    if (dispatch) {
                        dispatch(tr);
                    }
                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        const editor = this.editor;
        const { searchResultClass, selectedResultClass, disableRegex } =
            this.options;

        return [
            new Plugin({
                key: searchAndReplacePluginKey,
                state: {
                    init: () => DecorationSet.empty,
                    apply(tr, oldState) {
                        const storage = editor.storage
                            .searchAndReplace as SearchAndReplaceStorage;

                        const meta = tr.getMeta(searchAndReplacePluginKey) as
                            | RefreshMeta
                            | undefined;

                        if (
                            !tr.docChanged &&
                            !meta &&
                            storage.lastSearchTerm === storage.searchTerm &&
                            storage.lastSelectedResult ===
                                storage.selectedResult &&
                            storage.lastCaseSensitiveState ===
                                storage.caseSensitive
                        ) {
                            return oldState;
                        }

                        storage.lastSearchTerm = storage.searchTerm;
                        storage.lastSelectedResult = storage.selectedResult;
                        storage.lastCaseSensitiveState = storage.caseSensitive;

                        if (!storage.searchTerm) {
                            storage.selectedResult = 0;
                            storage.results = [];
                            return DecorationSet.empty;
                        }

                        const regex = getRegex({
                            searchString: storage.searchTerm,
                            disableRegex,
                            caseSensitive: storage.caseSensitive,
                        });

                        const { decorationsToReturn, results } =
                            processSearches({
                                doc: tr.doc,
                                searchTerm: regex,
                                selectedResultIndex: storage.selectedResult,
                                searchResultClass,
                                selectedResultClass,
                            });

                        storage.results = results;

                        if (storage.selectedResult >= results.length) {
                            storage.selectedResult = results.length
                                ? results.length - 1
                                : 0;
                        }

                        return decorationsToReturn;
                    },
                },
                props: {
                    decorations(state) {
                        return this.getState(state);
                    },
                },
            }),
        ];
    },
});

export default SearchAndReplace;
