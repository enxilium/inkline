import type { Configuration } from "webpack";

import { plugins } from "./webpack.plugins";

export const rendererConfig: Configuration = {
    target: "web",
    devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /(node_modules|\.webpack)/,
                use: {
                    loader: "ts-loader",
                    options: {
                        transpileOnly: true,
                    },
                },
            },
            {
                test: /\.css$/,
                use: [{ loader: "style-loader" }, { loader: "css-loader" }],
            },
            {
                test: /\.(woff2?|woff|ttf|otf|eot)$/i,
                type: "asset/resource",
                generator: {
                    filename: "fonts/[name][contenthash][ext][query]",
                },
            },
        ],
    },
    plugins,
    resolve: {
        extensions: [".js", ".ts", ".jsx", ".tsx", ".css"],
    },
};
