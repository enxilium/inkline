import type { Configuration } from "webpack";

import { rules } from "./webpack.rules";
import { plugins } from "./webpack.plugins";

export const mainConfig: Configuration = {
    /**
     * This is the main entry point for your application, it's the first file
     * that runs in the main process.
     */
    entry: "./src/main/main.ts",
    target: "electron-main",
    // Put your normal webpack config below here
    module: {
        rules,
    },
    plugins,
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
    },
    // epub-gen uses __dirname-relative paths to load EJS templates and CSS at
    // runtime. Bundling it with Webpack rewrites __dirname and breaks those
    // lookups ("Custom file to OPF template not found"). Keeping it external
    // lets Node require() resolve the real node_modules path.
    externals: {
        "epub-gen": "commonjs epub-gen",
    },
};
