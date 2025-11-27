import { contextBridge, ipcRenderer } from "electron";
import {
    controllerChannels,
    type ControllerChannelMap,
    type RendererApi,
} from "../controllers/contracts";
import {
    AUTH_STATE_CHANGED_CHANNEL,
    type AuthStatePayload,
} from "../controllers/auth/AuthStateGateway";

type AsyncHandler = (...args: unknown[]) => Promise<unknown>;

type ControllerInvoker<THandler extends AsyncHandler> = (
    ...args: Parameters<THandler>
) => ReturnType<THandler>;

const bindController = <THandler extends AsyncHandler>(
    channel: string
): ControllerInvoker<THandler> => {
    return ((...args: Parameters<THandler>) =>
        ipcRenderer.invoke(channel, ...args)) as ControllerInvoker<THandler>;
};

const createCategoryBindings = (category: keyof RendererApi) => {
    const categoryChannels = controllerChannels[category];
    const bindings: Record<string, (...args: unknown[]) => Promise<unknown>> =
        {};

    for (const [action, channel] of Object.entries(categoryChannels)) {
        bindings[action] = bindController(channel as string);
    }

    return bindings;
};

const createRendererApi = (): RendererApi => {
    const bindings: Record<
        string,
        Record<string, (...args: unknown[]) => Promise<unknown>>
    > = {};

    for (const category of Object.keys(controllerChannels)) {
        bindings[category] = createCategoryBindings(
            category as keyof RendererApi
        );
    }

    return bindings as RendererApi;
};

const api = createRendererApi();

contextBridge.exposeInMainWorld("api", api);

type AuthStateListener = (payload: AuthStatePayload) => void;

const createAuthEvents = () => {
    const onStateChanged = (listener: AuthStateListener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: AuthStatePayload
        ) => {
            listener(payload);
        };
        ipcRenderer.on(AUTH_STATE_CHANGED_CHANNEL, handler);
        return () =>
            ipcRenderer.removeListener(AUTH_STATE_CHANGED_CHANNEL, handler);
    };

    return { onStateChanged };
};

const authEvents = createAuthEvents();

contextBridge.exposeInMainWorld("authEvents", authEvents);

declare global {
    interface Window {
        api: typeof api;
        authEvents: typeof authEvents;
    }
}
