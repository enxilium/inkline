/**
 * @deprecated Do not use this module.
 * Renderer <-> main IPC calls must go through the Zustand appStore.
 * (See eslint rule in .eslintrc.json)
 */

export const ensureRendererApi = (): never => {
    throw new Error(
        "Do not use ensureRendererApi(). Route IPC calls through appStore actions instead."
    );
};

/**
 * @deprecated Do not use this module.
 * Auth event wiring must be owned by appStore.
 */
export const ensureAuthEvents = (): never => {
    throw new Error(
        "Do not use ensureAuthEvents(). Auth events should be handled by appStore."
    );
};
