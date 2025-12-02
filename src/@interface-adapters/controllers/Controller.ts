import { IpcMainInvokeEvent } from "electron";

export interface Controller<TArgs extends unknown[], TResult> {
    handle(...args: TArgs): Promise<TResult>;
}

export interface IpcController<TArgs extends unknown[], TResult>
    extends Controller<TArgs, TResult> {
    handleWithEvent(
        event: IpcMainInvokeEvent,
        ...args: TArgs
    ): Promise<TResult>;
}
