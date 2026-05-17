import { Extension, textInputRule } from "@tiptap/core";

export const EmDash = Extension.create({
    name: "emDash",

    addInputRules() {
        return [
            textInputRule({
                find: /-- $/,
                replace: "— ",
            }),
        ];
    },
});
