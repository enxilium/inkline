import type { ForgeConfig } from "@electron-forge/shared-types";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";

const config: ForgeConfig = {
    packagerConfig: {
        asar: true,
        // Workflow files are bundled separately (server/ComfyUI downloaded at runtime)
        extraResource: ["./assets/workflows"],
        icon: "./assets/app-icon",
    },
    rebuildConfig: {},
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                iconUrl:
                    "https://github.com/enxilium/inkline/blob/main/assets/app-icon.ico",
                setupIcon: "./assets/installer.ico",
            },
        },
        {
            name: "@electron-forge/maker-deb",
            config: {
                options: {
                    icon: "./assets/app-icon.png",
                },
            },
        },
        {
            // Path to the icon to use for the app in the DMG window
            name: "@electron-forge/maker-dmg",
            config: {
                icon: "./assets/app-icon.icns",
            },
        },
    ],
    plugins: [
        new AutoUnpackNativesPlugin({}),
        new WebpackPlugin({
            mainConfig,
            devContentSecurityPolicy:
                "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; media-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.languagetool.org http://127.0.0.1:* http://localhost:*;",
            renderer: {
                config: rendererConfig,
                entryPoints: [
                    {
                        html: "./src/renderer/index.html",
                        js: "./src/renderer/index.tsx",
                        name: "main_window",
                        preload: {
                            js: "./src/@interface-adapters/preload/preload.ts",
                        },
                    },
                    {
                        html: "./src/renderer/views/initialization/loading.html",
                        js: "./src/renderer/views/initialization/loading.tsx",
                        name: "loading_window",
                        preload: {
                            js: "./src/@interface-adapters/preload/preload.ts",
                        },
                    },
                    {
                        html: "./src/renderer/views/initialization/setup.html",
                        js: "./src/renderer/views/initialization/setup.tsx",
                        name: "setup_window",
                        preload: {
                            js: "./src/@interface-adapters/preload/setupPreload.ts",
                        },
                    },
                ],
            },
        }),
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};

export default config;
