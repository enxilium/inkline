import type IForkTsCheckerWebpackPlugin from "fork-ts-checker-webpack-plugin";
import webpack from "webpack";
import dotenv from "dotenv";

// Load environment variables from .env file
const env = dotenv.config().parsed || {};

// Convert env object to DefinePlugin format
const envKeys = Object.keys(env).reduce(
    (prev, key) => {
        prev[`process.env.${key}`] = JSON.stringify(env[key]);
        return prev;
    },
    {} as Record<string, string>
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ForkTsCheckerWebpackPlugin: typeof IForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

export const plugins = [
    new ForkTsCheckerWebpackPlugin({
        logger: "webpack-infrastructure",
    }),
    new webpack.DefinePlugin(envKeys),
];
